import { getLogs, getMessages } from '../db';
import { logger } from '../logger';
import { canRead, canWrite, findPod, newPod, removeEntry, resolveSecrets, writeEntry } from '../pods';
import { newProvider } from '../providers';
import {
  deleteConnector,
  deletePod,
  deleteProject,
  deleteProvider,
  getState,
  updateConv,
  updateSettings,
  upsertConnector,
  upsertPod,
  upsertProject,
  upsertProvider,
} from '../store';
import type { Connector, LogCategory, LogLevel, PodAccess, Project, Settings } from '../types';
import { maskSecret, now, truncate, uid } from '../util';
import { runSandboxed } from './sandbox';
import { bool, num, obj, str, type ToolDef } from './types';

const s = (v: unknown) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const json = (v: unknown) => JSON.stringify(v, null, 2);

function fail(msg: string): never {
  throw new Error(msg);
}

function podOrFail(name: unknown) {
  const pod = findPod(s(name));
  if (!pod) fail(`No pod named "${s(name)}". Use pods_list to see available pods.`);
  return pod;
}

// ── Pods ───────────────────────────────────────────────────

const podTools: ToolDef[] = [
  {
    name: 'pods_list',
    label: 'Pods · list',
    group: 'pods',
    source: 'app',
    readOnly: true,
    description:
      'List the pods (persistent key-value stores shared by you and the user; they survive across conversations). Call this before reading or writing pods, or when the user mentions saved notes, memory, secrets or keys.',
    inputSchema: obj({}),
    run: async () =>
      json(
        getState().pods.map((p) => ({
          name: p.name,
          emoji: p.emoji,
          description: p.description,
          secret: p.secret,
          pinned: !!p.pinned,
          ai_access: p.aiAccess,
          entries: p.entries.length,
          keys: p.aiAccess === 'none' ? undefined : p.entries.map((e) => e.key),
          created_by: p.createdBy,
        })),
      ),
  },
  {
    name: 'pod_read',
    label: 'Pods · read',
    group: 'pods',
    source: 'app',
    readOnly: true,
    description: 'Read entries from a pod. Omit `key` to read every entry. Pods with "use" access only reveal keys: reference their values as {{pod:NAME/KEY}} inside fetch_url instead.',
    inputSchema: obj({ pod: str('Pod name'), key: str('Entry key (optional)') }, ['pod']),
    run: async (i) => {
      const pod = podOrFail(i.pod);
      if (pod.aiAccess === 'none') fail(`Pod "${pod.name}" is private to the user.`);
      if (!canRead(pod)) {
        return json({ pod: pod.name, note: 'Values are hidden (use-only). Reference them as {{pod:' + pod.name + '/KEY}} in fetch_url.', keys: pod.entries.map((e) => e.key) });
      }
      const entries = i.key ? pod.entries.filter((e) => e.key === s(i.key)) : pod.entries;
      if (i.key && !entries.length) fail(`Pod "${pod.name}" has no key "${s(i.key)}".`);
      return json({ pod: pod.name, description: pod.description, entries: entries.map((e) => ({ key: e.key, value: e.value, updated_by: e.updatedBy, updated_at: new Date(e.updatedAt).toISOString() })) });
    },
  },
  {
    name: 'pod_write',
    label: 'Pods · write',
    group: 'pods',
    source: 'app',
    readOnly: false,
    description: 'Create or overwrite one entry in a pod. Creates the pod if it does not exist. Use this to remember things across conversations (notes, preferences, journal entries, credentials the user gives you).',
    inputSchema: obj(
      {
        pod: str('Pod name'),
        key: str('Entry key'),
        value: str('Entry value (plain text or JSON)'),
        secret: bool('Only when creating a new pod: hide its values in the UI'),
      },
      ['pod', 'key', 'value'],
    ),
    run: async (i) => {
      let pod = findPod(s(i.pod));
      if (!pod) {
        pod = newPod({ name: s(i.pod).trim() || 'notes', secret: i.secret === true, emoji: i.secret ? '🔐' : '📦' }, 'ai');
        upsertPod(pod);
      }
      if (!canWrite(pod)) fail(`Pod "${pod.name}" is read-only for you (access: ${pod.aiAccess}).`);
      writeEntry(pod, s(i.key), s(i.value), 'ai');
      return `Saved ${pod.name}/${s(i.key)}.`;
    },
  },
  {
    name: 'pod_delete',
    label: 'Pods · delete',
    group: 'pods',
    source: 'app',
    readOnly: false,
    description: 'Delete one entry from a pod, or the whole pod when `key` is omitted.',
    inputSchema: obj({ pod: str('Pod name'), key: str('Entry key (omit to delete the pod)') }, ['pod']),
    run: async (i) => {
      const pod = podOrFail(i.pod);
      if (!canWrite(pod)) fail(`Pod "${pod.name}" is read-only for you.`);
      if (i.key) {
        removeEntry(pod, s(i.key));
        return `Deleted ${pod.name}/${s(i.key)}.`;
      }
      deletePod(pod.id);
      return `Deleted pod ${pod.name}.`;
    },
  },
  {
    name: 'pod_configure',
    label: 'Pods · configure',
    group: 'pods',
    source: 'app',
    readOnly: false,
    description: 'Create a pod or change its description, emoji, secret flag or pinned flag. Pinned pods are included in the context of every new conversation (use one as long-term memory).',
    inputSchema: obj(
      {
        pod: str('Pod name (created if missing)'),
        new_name: str('Rename the pod'),
        description: str('What the pod is for'),
        emoji: str('One emoji'),
        secret: bool('Hide values in the UI'),
        pinned: bool('Include this pod in every new conversation'),
      },
      ['pod'],
    ),
    run: async (i) => {
      let pod = findPod(s(i.pod));
      const created = !pod;
      if (!pod) pod = newPod({ name: s(i.pod).trim() }, 'ai');
      else if (!canWrite(pod)) fail(`Pod "${pod.name}" is read-only for you.`);
      const next = {
        ...pod,
        ...(i.new_name ? { name: s(i.new_name) } : {}),
        ...(i.description !== undefined ? { description: s(i.description) } : {}),
        ...(i.emoji ? { emoji: s(i.emoji) } : {}),
        ...(typeof i.secret === 'boolean' ? { secret: i.secret } : {}),
        ...(typeof i.pinned === 'boolean' ? { pinned: i.pinned } : {}),
      };
      upsertPod(next);
      return `${created ? 'Created' : 'Updated'} pod ${next.name}.`;
    },
  },
];

// ── App management ─────────────────────────────────────────

function providerView(p: ReturnType<typeof getState>['providers'][number]) {
  const see = getState().settings.aiCanSeeKeys;
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    base_url: p.baseURL,
    api_keys: p.apiKeys.filter(Boolean).map((k) => (see ? k : maskSecret(k))),
    models: p.models.map((m) => m.id),
    enabled: p.enabled,
  };
}

function connectorView(c: Connector) {
  const see = getState().settings.aiCanSeeKeys;
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    mode: c.mode,
    auth: c.auth,
    token: c.token ? (see ? c.token : maskSecret(c.token)) : undefined,
    enabled: c.enabled,
    status: getState().mcp[c.id]?.state ?? 'idle',
    tools: (c.toolCache ?? []).map((t) => t.name),
  };
}

function projectView(p: Project, full = false) {
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    description: p.description,
    instructions: full ? p.instructions : truncate(p.instructions, 400),
    files: p.files.map((f) => f.name),
    model: p.model,
    provider_id: p.providerId,
  };
}

const SAFE_SETTINGS: (keyof Settings)[] = [
  'userName',
  'systemPrompt',
  'language',
  'theme',
  'fontSize',
  'assistantFont',
  'defaultProviderId',
  'defaultModel',
  'autoTitle',
  'defaultThinking',
];

const manageTools: ToolDef[] = [
  {
    name: 'app_overview',
    label: 'App · overview',
    group: 'manage',
    source: 'app',
    readOnly: true,
    description: 'Summary of this app: current conversation, projects, providers, connectors, pods and the main settings. Call this first when the user asks you to change or inspect the app.',
    inputSchema: obj({}),
    run: async (_i, ctx) => {
      const st = getState();
      const conv = st.convs.find((c) => c.id === ctx.convId);
      return json({
        conversation: conv && { id: conv.id, title: conv.title, project_id: conv.projectId, provider_id: conv.providerId, model: conv.model },
        projects: st.projects.map((p) => ({ id: p.id, name: p.name })),
        providers: st.providers.map(providerView),
        connectors: st.connectors.map(connectorView),
        pods: st.pods.map((p) => ({ name: p.name, entries: p.entries.length, ai_access: p.aiAccess })),
        settings: Object.fromEntries(SAFE_SETTINGS.map((k) => [k, st.settings[k]])),
        conversations: st.convs.length,
      });
    },
  },
  {
    name: 'project_list',
    label: 'Projects · list',
    group: 'manage',
    source: 'app',
    readOnly: true,
    description: 'List projects (workspaces with their own instructions, knowledge files and default model).',
    inputSchema: obj({ id: str('Return one project in full') }),
    run: async (i) => {
      const ps = getState().projects;
      if (i.id) {
        const p = ps.find((x) => x.id === s(i.id));
        if (!p) fail('Project not found');
        return json(projectView(p, true));
      }
      return json(ps.map((p) => projectView(p)));
    },
  },
  {
    name: 'project_upsert',
    label: 'Projects · save',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description: 'Create a project (omit id) or update one (pass id). Only the fields you pass are changed.',
    inputSchema: obj({
      id: str('Project id to update'),
      name: str('Name'),
      emoji: str('One emoji'),
      description: str('Short description'),
      instructions: str('Custom instructions for chats in this project'),
      provider_id: str('Default provider id'),
      model: str('Default model id'),
    }),
    run: async (i) => {
      const existing = i.id ? getState().projects.find((p) => p.id === s(i.id)) : undefined;
      if (i.id && !existing) fail('Project not found');
      const base: Project = existing ?? {
        id: uid('pj_'),
        name: 'New project',
        emoji: '📁',
        description: '',
        instructions: '',
        files: [],
        createdAt: now(),
        updatedAt: now(),
      };
      const next: Project = {
        ...base,
        ...(i.name !== undefined ? { name: s(i.name) } : {}),
        ...(i.emoji !== undefined ? { emoji: s(i.emoji) } : {}),
        ...(i.description !== undefined ? { description: s(i.description) } : {}),
        ...(i.instructions !== undefined ? { instructions: s(i.instructions) } : {}),
        ...(i.provider_id !== undefined ? { providerId: s(i.provider_id) || undefined } : {}),
        ...(i.model !== undefined ? { model: s(i.model) || undefined } : {}),
      };
      upsertProject(next);
      return `${existing ? 'Updated' : 'Created'} project ${next.name} (${next.id}).`;
    },
  },
  {
    name: 'project_delete',
    label: 'Projects · delete',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description: 'Delete a project. Its conversations are kept but detached.',
    inputSchema: obj({ id: str('Project id') }, ['id']),
    run: async (i) => {
      const p = getState().projects.find((x) => x.id === s(i.id));
      if (!p) fail('Project not found');
      deleteProject(p.id);
      return `Deleted project ${p.name}.`;
    },
  },
  {
    name: 'provider_list',
    label: 'Providers · list',
    group: 'manage',
    source: 'app',
    readOnly: true,
    description: 'List API providers (suppliers). API keys are masked unless the user allowed you to see them.',
    inputSchema: obj({}),
    run: async () => json(getState().providers.map(providerView)),
  },
  {
    name: 'provider_upsert',
    label: 'Providers · save',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description:
      'Add a provider (omit id) or update one. kind "anthropic" = Anthropic Messages API format, "openai" = OpenAI Chat Completions format (most other vendors, proxies and cc-bridge). api_keys replaces the key pool; keys may be {{pod:NAME/KEY}} references.',
    inputSchema: obj({
      id: str('Provider id to update'),
      name: str('Display name'),
      kind: str('API format', { enum: ['anthropic', 'openai'] }),
      base_url: str('Base URL, e.g. https://api.openai.com/v1'),
      api_keys: { type: 'array', items: { type: 'string' }, description: 'Key pool (rotated on failure)' },
      models: { type: 'array', items: { type: 'string' }, description: 'Model ids' },
      enabled: bool('Enabled'),
    }),
    run: async (i) => {
      const existing = i.id ? getState().providers.find((p) => p.id === s(i.id)) : undefined;
      if (i.id && !existing) fail('Provider not found');
      const base = existing ?? newProvider();
      const kind = i.kind === 'anthropic' || i.kind === 'openai' ? i.kind : base.kind;
      const next = {
        ...base,
        kind,
        ...(i.name !== undefined ? { name: s(i.name) } : {}),
        ...(i.base_url !== undefined ? { baseURL: s(i.base_url) } : {}),
        ...(Array.isArray(i.api_keys) ? { apiKeys: (i.api_keys as unknown[]).map(s) } : {}),
        ...(Array.isArray(i.models) ? { models: (i.models as unknown[]).map((m) => ({ id: s(m) })) } : {}),
        ...(typeof i.enabled === 'boolean' ? { enabled: i.enabled } : {}),
      };
      if (!existing) {
        next.promptCaching = kind === 'anthropic';
      }
      // Never let a new URL inherit stored keys: that would let an injected instruction
      // redirect the user's API keys to another server.
      let note = '';
      if (existing && next.baseURL.trim() !== existing.baseURL.trim() && !Array.isArray(i.api_keys)) {
        next.apiKeys = [''];
        next.headers = [];
        note = ' The base URL changed, so the stored API keys and custom headers were removed — the user must re-enter them.';
      }
      upsertProvider(next);
      return `${existing ? 'Updated' : 'Added'} provider ${next.name} (${next.id}).${note}`;
    },
  },
  {
    name: 'provider_delete',
    label: 'Providers · delete',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description: 'Delete a provider.',
    inputSchema: obj({ id: str('Provider id') }, ['id']),
    run: async (i) => {
      const p = getState().providers.find((x) => x.id === s(i.id));
      if (!p) fail('Provider not found');
      deleteProvider(p.id);
      return `Deleted provider ${p.name}.`;
    },
  },
  {
    name: 'connector_list',
    label: 'Connectors · list',
    group: 'manage',
    source: 'app',
    readOnly: true,
    description: 'List MCP connectors and their tools.',
    inputSchema: obj({}),
    run: async () => json(getState().connectors.map(connectorView)),
  },
  {
    name: 'connector_upsert',
    label: 'Connectors · save',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description:
      'Add (omit id) or update an MCP connector. mode "client" = this browser connects (server must allow CORS); "api" = Anthropic connects server-side (Anthropic providers only). New tools become available on the next message.',
    inputSchema: obj({
      id: str('Connector id to update'),
      name: str('Display name'),
      url: str('MCP server URL (Streamable HTTP or SSE)'),
      mode: str('Who connects', { enum: ['client', 'api'] }),
      auth: str('Authentication', { enum: ['none', 'bearer', 'basic', 'oauth'] }),
      token: str('Bearer token, or "user:password" for basic (may be a {{pod:NAME/KEY}} reference)'),
      enabled: bool('Enabled'),
    }),
    run: async (i) => {
      const existing = i.id ? getState().connectors.find((c) => c.id === s(i.id)) : undefined;
      if (i.id && !existing) fail('Connector not found');
      const base: Connector = existing ?? {
        id: uid('mc_'),
        name: 'connector',
        url: '',
        transport: 'auto',
        auth: 'none',
        token: '',
        headers: [],
        mode: 'client',
        enabled: true,
        autoApprove: false,
        disabledTools: [],
        useCorsProxy: false,
        createdAt: now(),
        updatedAt: now(),
      };
      const next: Connector = {
        ...base,
        ...(i.name !== undefined ? { name: s(i.name) } : {}),
        ...(i.url !== undefined ? { url: s(i.url) } : {}),
        ...(i.mode === 'client' || i.mode === 'api' ? { mode: i.mode } : {}),
        ...(i.auth === 'none' || i.auth === 'bearer' || i.auth === 'basic' || i.auth === 'oauth' ? { auth: i.auth } : {}),
        ...(i.token !== undefined ? { token: s(i.token) } : {}),
        ...(typeof i.enabled === 'boolean' ? { enabled: i.enabled } : {}),
      };
      // Same rule as providers: credentials never follow a URL change.
      let note = '';
      if (existing && next.url.trim() !== existing.url.trim()) {
        if (i.token === undefined) next.token = '';
        next.headers = [];
        next.oauth = undefined;
        next.autoApprove = false;
        note = ' The URL changed, so stored credentials were cleared.';
      }
      upsertConnector(next);
      return `${existing ? 'Updated' : 'Added'} connector ${next.name} (${next.id}).${note}`;
    },
  },
  {
    name: 'connector_delete',
    label: 'Connectors · delete',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description: 'Delete an MCP connector.',
    inputSchema: obj({ id: str('Connector id') }, ['id']),
    run: async (i) => {
      const c = getState().connectors.find((x) => x.id === s(i.id));
      if (!c) fail('Connector not found');
      deleteConnector(c.id);
      return `Deleted connector ${c.name}.`;
    },
  },
  {
    name: 'settings_update',
    label: 'Settings · update',
    group: 'manage',
    source: 'app',
    readOnly: false,
    description: `Change app settings. Allowed keys: ${SAFE_SETTINGS.join(', ')}. (Permission and network settings can only be changed by the user.)`,
    inputSchema: obj({ changes: { type: 'object', description: 'Settings to change', additionalProperties: true } }, ['changes']),
    run: async (i) => {
      const changes = (i.changes ?? {}) as Record<string, unknown>;
      const patch: Partial<Settings> = {};
      const rejected: string[] = [];
      for (const [k, v] of Object.entries(changes)) {
        if ((SAFE_SETTINGS as string[]).includes(k)) (patch as Record<string, unknown>)[k] = v;
        else rejected.push(k);
      }
      updateSettings(patch);
      return `Updated: ${Object.keys(patch).join(', ') || 'nothing'}${rejected.length ? `. Not allowed: ${rejected.join(', ')}` : ''}`;
    },
  },
  {
    name: 'conversation_set_title',
    label: 'Chat · rename',
    group: 'manage',
    source: 'app',
    readOnly: true,
    description: 'Rename the current conversation (or another one by id).',
    inputSchema: obj({ title: str('New title'), id: str('Conversation id (default: current)') }, ['title']),
    run: async (i, ctx) => {
      updateConv(s(i.id) || ctx.convId, { title: s(i.title).slice(0, 120) });
      return 'Renamed.';
    },
  },
];

// ── History ────────────────────────────────────────────────

function transcript(msgs: Awaited<ReturnType<typeof getMessages>>, max: number): string {
  return msgs
    .slice(-max)
    .map((m) => {
      if (m.role === 'user') {
        const files = (m.attachments ?? []).map((a) => `[file: ${a.name}]`).join(' ');
        return `USER: ${files ? files + ' ' : ''}${m.text ?? ''}`;
      }
      const parts = (m.blocks ?? [])
        .map((b) => (b.type === 'text' ? b.text : b.type === 'tool_use' ? `[tool ${b.name}]` : ''))
        .filter(Boolean)
        .join('\n');
      return `ASSISTANT: ${parts}`;
    })
    .join('\n\n');
}

const historyTools: ToolDef[] = [
  {
    name: 'conversation_search',
    label: 'History · search',
    group: 'history',
    source: 'app',
    readOnly: true,
    description: 'Search past conversations by title and content. Use it when the user refers to something discussed before.',
    inputSchema: obj({ query: str('Words to search for (optional)'), project_id: str('Limit to one project'), limit: num('Max results (default 15)') }),
    run: async (i, ctx) => {
      const q = s(i.query).toLowerCase().trim();
      const limit = Math.min(50, Number(i.limit) || 15);
      const convs = getState().convs.filter((c) => c.id !== ctx.convId && (!i.project_id || c.projectId === s(i.project_id)));
      const out: unknown[] = [];
      for (const c of convs.slice(0, 300)) {
        if (out.length >= limit) break;
        let snippet = c.preview ?? '';
        if (q) {
          if (!c.title.toLowerCase().includes(q)) {
            const msgs = getState().messages[c.id] ?? (await getMessages(c.id));
            const text = transcript(msgs, 400);
            const at = text.toLowerCase().indexOf(q);
            if (at < 0) continue;
            snippet = text.slice(Math.max(0, at - 120), at + 200);
          }
        }
        out.push({ id: c.id, title: c.title || '(untitled)', updated: new Date(c.updatedAt).toISOString(), project_id: c.projectId, snippet });
      }
      return json(out);
    },
  },
  {
    name: 'conversation_read',
    label: 'History · read',
    group: 'history',
    source: 'app',
    readOnly: true,
    description: 'Read the transcript of a past conversation.',
    inputSchema: obj({ id: str('Conversation id'), max_messages: num('Most recent N messages (default 40)') }, ['id']),
    run: async (i) => {
      const c = getState().convs.find((x) => x.id === s(i.id));
      if (!c) fail('Conversation not found');
      const msgs = getState().messages[c.id] ?? (await getMessages(c.id));
      return truncate(`# ${c.title || '(untitled)'}\n\n${transcript(msgs, Number(i.max_messages) || 40)}`, 60000);
    },
  },
];

// ── Logs ───────────────────────────────────────────────────

const logTools: ToolDef[] = [
  {
    name: 'logs_query',
    label: 'Logs · query',
    group: 'logs',
    source: 'app',
    readOnly: true,
    description: 'Read the app log (API requests, tool calls, MCP events, errors, and journal entries written with log_write). Use it to debug failures.',
    inputSchema: obj({
      category: str('Filter', { enum: ['request', 'tool', 'mcp', 'app', 'ai'] }),
      level: str('Minimum level', { enum: ['debug', 'info', 'warn', 'error'] }),
      search: str('Text to search for'),
      limit: num('Max entries (default 30)'),
    }),
    run: async (i) => {
      const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      const min = order.indexOf((s(i.level) || 'debug') as LogLevel);
      const q = s(i.search).toLowerCase();
      const all = await getLogs(3000);
      const out = all
        .filter((l) => (!i.category || l.category === (i.category as LogCategory)) && order.indexOf(l.level) >= min && (!q || (l.message + JSON.stringify(l.data ?? '')).toLowerCase().includes(q)))
        .slice(0, Math.min(200, Number(i.limit) || 30))
        .map((l) => ({ time: new Date(l.ts).toISOString(), level: l.level, category: l.category, message: l.message, data: l.data }));
      return truncate(json(out), 40000);
    },
  },
  {
    name: 'log_write',
    label: 'Logs · write',
    group: 'logs',
    source: 'app',
    readOnly: true,
    description: 'Write an entry to the app log (category "ai"). Use it as your own work journal: decisions, progress, things to follow up.',
    inputSchema: obj({ message: str('Log message'), level: str('Level', { enum: ['info', 'warn', 'error'] }), data: { type: 'object', description: 'Optional structured data', additionalProperties: true } }, ['message']),
    run: async (i, ctx) => {
      const lvl = (['info', 'warn', 'error'].includes(s(i.level)) ? s(i.level) : 'info') as LogLevel;
      logger[lvl === 'info' ? 'info' : lvl === 'warn' ? 'warn' : 'error']('ai', s(i.message), i.data, ctx.convId);
      return 'Logged.';
    },
  },
];

// ── Utilities ──────────────────────────────────────────────

const utilTools: ToolDef[] = [
  {
    name: 'current_time',
    label: 'Time',
    group: 'core',
    source: 'app',
    readOnly: true,
    description: "Get the user's current local date, time and time zone.",
    inputSchema: obj({}),
    run: async () => {
      const d = new Date();
      return json({ iso: d.toISOString(), local: d.toString(), time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    },
  },
];

const jsTools: ToolDef[] = [
  {
    name: 'run_javascript',
    label: 'JavaScript',
    group: 'javascript',
    source: 'app',
    readOnly: true,
    description:
      'Run JavaScript in an isolated sandbox (a Web Worker with no DOM and no access to app data) and get console output plus the returned value. The code is the body of an async function: use `return` for the result and `await` freely. Use it for calculations, data processing and quick checks. Time limit 20s.',
    inputSchema: obj({ code: str('JavaScript source (async function body)') }, ['code']),
    run: async (i, ctx) => {
      const r = await runSandboxed(s(i.code), 20000, ctx.signal);
      const lines = [...r.logs];
      if (r.ok && r.result !== undefined) lines.push(`→ ${r.result}`);
      if (!r.ok) {
        lines.push(`Error: ${r.error}`);
        throw new Error(truncate(lines.join('\n'), 20000));
      }
      return truncate(lines.join('\n') || '(no output)', 30000);
    },
  },
];

const fetchTools: ToolDef[] = [
  {
    name: 'fetch_url',
    label: 'Fetch',
    group: 'fetch',
    source: 'app',
    readOnly: false,
    description:
      'Make an HTTP request from the user\'s browser and return the response (text is truncated to ~60k chars; images are returned as images). Subject to browser CORS rules. Secrets can be referenced as {{pod:NAME/KEY}} in the url, headers or body and are substituted locally.',
    inputSchema: obj(
      {
        url: str('URL'),
        method: str('HTTP method (default GET)'),
        headers: { type: 'object', additionalProperties: { type: 'string' }, description: 'Request headers' },
        body: str('Request body'),
      },
      ['url'],
    ),
    run: async (i, ctx) => {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries((i.headers ?? {}) as Record<string, unknown>)) headers[k] = resolveSecrets(s(v), true);
      const method = (s(i.method) || 'GET').toUpperCase();
      const res = await fetch(resolveSecrets(s(i.url), true), {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : resolveSecrets(s(i.body), true),
        signal: ctx.signal,
      });
      const ct = res.headers.get('content-type') ?? '';
      if (ct.startsWith('image/')) {
        const buf = await res.arrayBuffer();
        const { arrayBufferToBase64 } = await import('../files');
        return [
          { type: 'text', text: `HTTP ${res.status} ${ct} (${buf.byteLength} bytes)` },
          { type: 'image', data: arrayBufferToBase64(buf), mime: ct.split(';')[0] },
        ];
      }
      let text = await res.text();
      if (ct.includes('json')) {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          /* raw */
        }
      } else if (ct.includes('html')) {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        doc.querySelectorAll('script,style,noscript,svg').forEach((n) => n.remove());
        const title = doc.title;
        text = `${title ? `# ${title}\n\n` : ''}${(doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim()}`;
      }
      return `HTTP ${res.status} ${res.statusText}\ncontent-type: ${ct}\n\n${truncate(text, 60000)}`;
    },
  },
];

export function builtinTools(): ToolDef[] {
  const t = getState().settings.tools;
  return [
    ...utilTools,
    ...(t.pods ? podTools : []),
    ...(t.manage ? manageTools : []),
    ...(t.history ? historyTools : []),
    ...(t.logs ? logTools : []),
    ...(t.javascript ? jsTools : []),
    ...(t.fetch ? fetchTools : []),
  ];
}

export function allBuiltinNames(): { group: string; name: string; label: string; readOnly: boolean }[] {
  return [...utilTools, ...podTools, ...manageTools, ...historyTools, ...logTools, ...jsTools, ...fetchTools].map((d) => ({
    group: d.group ?? 'core',
    name: d.name,
    label: d.label,
    readOnly: d.readOnly,
  }));
}

export type { PodAccess };
