import { logger } from './logger';
import { canRead } from './pods';
import { isThinkingSignatureError, ProviderError, streamChat, type KnowledgeParts, type StreamResult } from './providers';
import {
  getState,
  loadMessages,
  patchMessage,
  requestApproval,
  setMessages,
  setRunning,
  cancelApprovals,
  toast,
  updateConv,
  updateSettings,
} from './store';
import { gatherTools, needsApproval, type ToolSet } from './tools/registry';
import type { Attachment, Block, ChatMessage, ConversationMeta, Project, Provider, ToolResultPart, Usage } from './types';
import { errorMessage, isAbort, now, safeJson, truncate, uid } from './util';

// ── resolution helpers ─────────────────────────────────────

export function resolveProvider(conv?: Pick<ConversationMeta, 'providerId' | 'projectId'>): Provider | undefined {
  const st = getState();
  const enabled = st.providers.filter((p) => p.enabled);
  const project = conv?.projectId ? st.projects.find((p) => p.id === conv.projectId) : undefined;
  const ids = [conv?.providerId, project?.providerId, st.settings.defaultProviderId];
  for (const id of ids) {
    const p = id && enabled.find((x) => x.id === id);
    if (p) return p;
  }
  return enabled[0];
}

export function resolveModel(provider: Provider | undefined, conv?: Pick<ConversationMeta, 'model' | 'projectId' | 'providerId'>): string {
  const st = getState();
  const project = conv?.projectId ? st.projects.find((p) => p.id === conv.projectId) : undefined;
  if (conv?.model && (!conv.providerId || conv.providerId === provider?.id)) return conv.model;
  if (project?.model && (!project.providerId || project.providerId === provider?.id)) return project.model;
  if (st.settings.defaultModel && (!st.settings.defaultProviderId || st.settings.defaultProviderId === provider?.id)) return st.settings.defaultModel;
  return provider?.models[0]?.id ?? '';
}

function pinnedContext(): string {
  const pods = getState().pods.filter((p) => p.pinned && canRead(p));
  if (!pods.length) return '';
  const body = pods
    .map((p) => {
      const entries = p.entries.map((e) => `${e.key}: ${e.value}`).join('\n');
      return `<pod name="${p.name}"${p.description ? ` description="${p.description.replace(/"/g, "'")}"` : ''}>\n${entries}\n</pod>`;
    })
    .join('\n');
  return truncate(`<pinned_pods>\n${body}\n</pinned_pods>`, 24000);
}

function buildSystem(conv: ConversationMeta, project: Project | undefined, toolset: ToolSet): string {
  const s = getState().settings;
  const lines = [
    'You are a helpful AI assistant inside Cove, a chat app the user runs in their own browser (often on a phone).',
    `The conversation started on ${conv.day}.${s.userName ? ` The user's name is ${s.userName}.` : ''}`,
    'Format replies in Markdown; use fenced code blocks with a language tag for code.',
  ];
  if (toolset.tools.some((t) => t.source === 'app' && t.name.startsWith('pod'))) {
    lines.push(
      'You can operate Cove itself with the built-in tools: pods (persistent key-value stores shared with the user that survive across conversations — use them freely as your memory and notebook), projects, providers, MCP connectors, settings, chat history and logs. When the user asks you to set something up in the app, do it with these tools and confirm what you changed.',
    );
  }
  const parts = [lines.join('\n')];
  if (s.systemPrompt.trim()) parts.push(`<user_instructions>\n${s.systemPrompt.trim()}\n</user_instructions>`);
  if (project) {
    const inner = [project.description, project.instructions].filter((x) => x.trim()).join('\n\n');
    parts.push(`<project name="${project.name.replace(/"/g, "'")}">\n${inner}\n</project>`);
  }
  if (conv.contextSnapshot) parts.push(conv.contextSnapshot);
  return parts.join('\n\n');
}

function knowledgeOf(project: Project | undefined): KnowledgeParts {
  if (!project?.files.length) return { systemText: '', media: [] };
  const texts = project.files.filter((f) => f.text !== undefined);
  const media = project.files
    .filter((f) => f.data && (f.mime.startsWith('image/') || f.mime === 'application/pdf'))
    .map((f) => ({ name: f.name, mime: f.mime, data: f.data!, kind: (f.mime === 'application/pdf' ? 'pdf' : 'image') as 'pdf' | 'image' }));
  const systemText = texts.length
    ? `<project_knowledge>\n${texts.map((f) => `<file name="${f.name.replace(/"/g, "'")}">\n${f.text}\n</file>`).join('\n')}\n</project_knowledge>`
    : '';
  return { systemText, media };
}

// ── public API ─────────────────────────────────────────────

export async function sendMessage(convId: string, text: string, attachments: Attachment[]) {
  const msgs = await loadMessages(convId);
  const user: ChatMessage = { id: uid('m_'), role: 'user', createdAt: now(), text, attachments };
  setMessages(convId, [...msgs, user], 'now');
  updateConv(convId, {}, true);
  await run(convId);
}

export async function regenerate(convId: string, assistantId: string) {
  const msgs = await loadMessages(convId);
  const idx = msgs.findIndex((m) => m.id === assistantId);
  if (idx < 0) return;
  setMessages(convId, msgs.slice(0, idx), 'now');
  await run(convId);
}

export async function editAndResend(convId: string, userId: string, text: string, attachments: Attachment[]) {
  const msgs = await loadMessages(convId);
  const idx = msgs.findIndex((m) => m.id === userId);
  if (idx < 0) return;
  const edited: ChatMessage = { ...msgs[idx], text, attachments, createdAt: now() };
  setMessages(convId, [...msgs.slice(0, idx), edited], 'now');
  await run(convId);
}

export function stop(convId: string) {
  getState().running[convId]?.abort();
  cancelApprovals(convId);
}

// ── the loop ───────────────────────────────────────────────

function addUsage(a: Usage | undefined, b: Usage): Usage {
  return {
    input: (a?.input ?? 0) + b.input,
    output: (a?.output ?? 0) + b.output,
    cacheRead: (a?.cacheRead ?? 0) + (b.cacheRead ?? 0),
    cacheWrite: (a?.cacheWrite ?? 0) + (b.cacheWrite ?? 0),
  };
}

async function run(convId: string) {
  if (getState().running[convId]) return;
  const ctrl = new AbortController();
  setRunning(convId, ctrl);
  let conv = getState().convs.find((c) => c.id === convId)!;
  const st = getState();
  const project = conv.projectId ? st.projects.find((p) => p.id === conv.projectId) : undefined;
  const provider = resolveProvider(conv);
  const model = resolveModel(provider, conv);
  const started = now();

  const assistant: ChatMessage = {
    id: uid('m_'),
    role: 'assistant',
    createdAt: now(),
    blocks: [],
    status: 'streaming',
    providerId: provider?.id,
    providerKind: provider?.kind,
    model,
  };
  setMessages(convId, [...(getState().messages[convId] ?? []), assistant]);

  const finish = (patch: Partial<ChatMessage>) => {
    patchMessage(convId, assistant.id, (m) => ({ ...m, ...patch, durationMs: now() - started }));
  };

  if (!provider || !model) {
    finish({ status: 'error', error: provider ? 'NO_MODEL' : 'NO_PROVIDER' });
    setRunning(convId, null);
    setMessages(convId, getState().messages[convId], 'now');
    return;
  }

  if (conv.contextSnapshot === undefined) {
    updateConv(convId, { contextSnapshot: pinnedContext() });
    conv = getState().convs.find((c) => c.id === convId)!;
  }

  let toolset: ToolSet;
  try {
    toolset = await gatherTools(conv, project, provider);
  } catch (e) {
    toolset = { tools: [], byName: new Map(), apiMcp: [], warnings: [errorMessage(e)] };
  }
  for (const w of toolset.warnings) toast(w, 'error');

  const system = buildSystem(conv, project, toolset);
  const knowledge = knowledgeOf(project);
  const s = getState().settings;
  const temperature = s.temperature.trim() === '' ? undefined : Number(s.temperature);
  let usage: Usage | undefined;
  let servedModel: string | undefined;
  let step = 0;
  let stripThinking = false;
  let reqProvider = provider;

  // Batch streaming updates into one store write per animation frame.
  let pending: Block[] | null = null;
  let prior: Block[] = [];
  let raf = 0;
  const flush = () => {
    raf = 0;
    if (!pending) return;
    const blocks = [...prior, ...pending];
    pending = null;
    patchMessage(convId, assistant.id, (m) => ({ ...m, blocks }));
  };
  const onUpdate = (stepBlocks: Block[]) => {
    pending = stepBlocks;
    if (!raf) raf = requestAnimationFrame(flush);
  };

  try {
    while (true) {
      const current = getState().messages[convId]!.find((m) => m.id === assistant.id)!;
      prior = current.blocks ?? [];
      const history = getState().messages[convId]!.slice(0, getState().messages[convId]!.findIndex((m) => m.id === assistant.id) + 1);
      let res: StreamResult;
      try {
        res = await streamChat(
          {
            provider: reqProvider,
            model,
            system,
            history,
            knowledge,
            tools: toolset.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
            mcpServers: toolset.apiMcp,
            webSearch: !!conv.webSearch,
            thinking: conv.thinking ?? s.defaultThinking,
            effort: conv.effort ?? s.defaultEffort,
            maxTokens: s.maxTokens,
            temperature: Number.isFinite(temperature) ? temperature : undefined,
            step,
            signal: ctrl.signal,
            stripThinking,
            onUpdate,
          },
          convId,
        );
      } catch (e) {
        if (reqProvider.refusalFallback && e instanceof ProviderError && e.status === 400 && /fallback/i.test(e.message)) {
          logger.warn('request', 'Endpoint rejected refusal fallbacks; retrying without them', undefined, convId);
          reqProvider = { ...reqProvider, refusalFallback: false };
          pending = null;
          patchMessage(convId, assistant.id, (m) => ({ ...m, blocks: prior }));
          continue;
        }
        if (!stripThinking && isThinkingSignatureError(e)) {
          logger.warn('request', 'Retrying without replayed thinking blocks after a thinking-signature error', undefined, convId);
          stripThinking = true;
          pending = null;
          patchMessage(convId, assistant.id, (m) => ({ ...m, blocks: prior }));
          continue;
        }
        throw e;
      }
      if (ctrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pending = null;
      usage = addUsage(usage, res.usage);
      servedModel = res.model ?? servedModel;
      let blocks = [...prior, ...res.blocks];

      const calls = res.blocks.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
      if (res.stopReason === 'max_tokens' && calls.length) {
        // Truncated tool input — never run it.
        blocks = blocks.map((b) =>
          b.type === 'tool_use' && b.step === step
            ? { ...b, status: 'error', isError: true, result: [{ type: 'text', text: 'Tool input was cut off (max_tokens reached). Not executed.' }] }
            : b,
        );
      }
      patchMessage(convId, assistant.id, (m) => ({ ...m, blocks, usage, model: servedModel ?? model, stopReason: res.stopReason, ...(res.stopDetails ? { error: safeJson(res.stopDetails, 0) } : {}) }));

      if (res.stopReason === 'refusal' || res.stopReason === 'max_tokens') break;
      if (res.stopReason === 'pause_turn') {
        step++;
        continue;
      }
      const runnable = calls.filter((c) => c.status === 'pending');
      if (!calls.length) break;
      await executeTools(convId, assistant.id, runnable, toolset, ctrl.signal);
      if (ctrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      step++;
      if (step >= s.maxSteps) {
        patchMessage(convId, assistant.id, (m) => ({
          ...m,
          blocks: [...(m.blocks ?? []), { type: 'text', step, text: `\n\n_Stopped after ${s.maxSteps} tool rounds (Settings › Max tool rounds)._` }],
        }));
        break;
      }
    }
    finish({ status: 'done' });
  } catch (e) {
    if (raf) cancelAnimationFrame(raf);
    if (pending) flush();
    const aborted = isAbort(e) || ctrl.signal.aborted;
    patchMessage(convId, assistant.id, (m) => ({
      ...m,
      blocks: (m.blocks ?? []).map((b) =>
        b.type === 'tool_use' && ['streaming', 'pending', 'awaiting', 'running'].includes(b.status) ? { ...b, status: 'error', isError: true, result: [{ type: 'text', text: 'Interrupted.' }] } : b,
      ),
    }));
    if (aborted) finish({ status: 'stopped' });
    else {
      finish({ status: 'error', error: errorMessage(e) });
      logger.error('app', `Run failed: ${errorMessage(e)}`, undefined, convId);
    }
  } finally {
    setRunning(convId, null);
    const msgs = getState().messages[convId] ?? [];
    setMessages(convId, msgs, 'now');
    updateConv(convId, { usage: addUsage(getState().convs.find((c) => c.id === convId)?.usage, usage ?? { input: 0, output: 0 }) }, true);
    void maybeTitle(convId, provider, model);
  }
}

async function executeTools(convId: string, msgId: string, calls: Extract<Block, { type: 'tool_use' }>[], toolset: ToolSet, signal: AbortSignal) {
  const setBlock = (id: string, patch: Partial<Extract<Block, { type: 'tool_use' }>>) =>
    patchMessage(convId, msgId, (m) => ({
      ...m,
      blocks: (m.blocks ?? []).map((b) => (b.type === 'tool_use' && b.id === id ? { ...b, ...patch } : b)),
    }));

  // Label + source for rendering.
  for (const c of calls) {
    const def = toolset.byName.get(c.name);
    setBlock(c.id, { label: def?.label ?? c.name, source: def?.source });
  }

  // 1) Permissions, one at a time (prompts appear in order).
  const approved: Extract<Block, { type: 'tool_use' }>[] = [];
  for (const c of calls) {
    if (signal.aborted) return;
    const def = toolset.byName.get(c.name);
    if (!def) {
      setBlock(c.id, { status: 'error', isError: true, result: [{ type: 'text', text: `Unknown tool "${c.name}". It may belong to a connector that is disconnected.` }] });
      continue;
    }
    if (needsApproval(def)) {
      setBlock(c.id, { status: 'awaiting' });
      const decision = await requestApproval({ id: c.id, convId, toolName: def.name, label: def.label, input: c.input });
      if (decision === 'deny') {
        setBlock(c.id, { status: 'denied' });
        logger.info('tool', `Denied ${def.label}`, { input: c.input }, convId);
        continue;
      }
      if (decision === 'always') updateSettings({ alwaysAllow: [...new Set([...getState().settings.alwaysAllow, def.name])] });
    }
    approved.push(c);
  }

  // 2) Run approved calls in parallel.
  await Promise.all(
    approved.map(async (c) => {
      const def = toolset.byName.get(c.name)!;
      const t0 = now();
      setBlock(c.id, { status: 'running', startedAt: t0 });
      try {
        const out = await def.run((c.input ?? {}) as Record<string, unknown>, { convId, signal });
        const parts: ToolResultPart[] = typeof out === 'string' ? [{ type: 'text', text: out }] : out;
        setBlock(c.id, { status: 'done', result: parts, endedAt: now() });
        logger.info('tool', `${def.label} ✓ ${now() - t0}ms`, { input: c.input, output: parts }, convId);
      } catch (e) {
        const parts = (e as { parts?: ToolResultPart[] }).parts ?? [{ type: 'text', text: errorMessage(e) }];
        setBlock(c.id, { status: 'error', isError: true, result: parts, endedAt: now() });
        logger.warn('tool', `${def.label} ✗ ${errorMessage(e)}`, { input: c.input, output: parts }, convId);
      }
    }),
  );
}

async function maybeTitle(convId: string, provider: Provider, model: string) {
  const s = getState().settings;
  const conv = getState().convs.find((c) => c.id === convId);
  if (!conv || conv.title || !s.autoTitle) return;
  const msgs = getState().messages[convId] ?? [];
  const firstUser = msgs.find((m) => m.role === 'user');
  const firstAssistant = msgs.find((m) => m.role === 'assistant' && m.status === 'done');
  const fallback = (firstUser?.text || firstUser?.attachments?.[0]?.name || '').replace(/\s+/g, ' ').slice(0, 48);
  if (!firstUser || !firstAssistant) {
    if (fallback) updateConv(convId, { title: fallback });
    return;
  }
  const answer = (firstAssistant.blocks ?? []).map((b) => (b.type === 'text' ? b.text : '')).join('').slice(0, 1500);
  try {
    const res = await streamChat({
      provider,
      model,
      system: 'You write very short conversation titles. Reply with the title only — at most 6 words, no quotes, no trailing punctuation, in the same language the user wrote in.',
      history: [
        {
          id: 't',
          role: 'user',
          createdAt: now(),
          text: `Write a title for this conversation.\n\nUser: ${(firstUser.text ?? '').slice(0, 1500)}\n\nAssistant: ${answer}`,
        },
      ],
      knowledge: { systemText: '', media: [] },
      tools: [],
      mcpServers: [],
      webSearch: false,
      thinking: false,
      effort: 'low',
      maxTokens: 1024,
      step: 0,
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    const title = res.blocks
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .replace(/^["'#\s]+|["'\s.。]+$/g, '')
      .split('\n')[0]
      .slice(0, 80);
    updateConv(convId, { title: title || fallback });
  } catch {
    updateConv(convId, { title: fallback });
  }
}
