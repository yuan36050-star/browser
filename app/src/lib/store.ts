import { create } from 'zustand';
import * as DB from './db';
import type {
  ChatMessage,
  Connector,
  ConversationMeta,
  Pod,
  Project,
  Provider,
  Settings,
} from './types';
import { now, today, uid } from './util';

export const DEFAULT_SETTINGS: Settings = {
  language: 'auto',
  theme: 'system',
  fontSize: 'md',
  assistantFont: 'sans',
  glassAlpha: 0.62,
  enterToSend: 'auto',
  userName: '',
  systemPrompt: '',
  permissionMode: 'auto-read',
  alwaysAllow: [],
  aiCanSeeKeys: false,
  tools: { pods: true, manage: true, logs: true, history: true, javascript: true, fetch: true },
  autoTitle: true,
  defaultThinking: true,
  defaultEffort: 'default',
  maxTokens: 32000,
  maxSteps: 40,
  temperature: '',
  logBodies: false,
  logRetention: 3000,
  corsProxy: '',
  onboarded: false,
};

export interface ApprovalRequest {
  id: string;
  convId: string;
  toolName: string;
  label: string;
  input: unknown;
  resolve: (decision: 'allow' | 'always' | 'deny') => void;
}

export type McpState = 'idle' | 'connecting' | 'connected' | 'error' | 'auth';

export interface McpStatus {
  state: McpState;
  error?: string;
  serverName?: string;
  at?: number;
}

export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface AppState {
  ready: boolean;
  settings: Settings;
  providers: Provider[];
  connectors: Connector[];
  projects: Project[];
  pods: Pod[];
  convs: ConversationMeta[];
  messages: Record<string, ChatMessage[]>;
  running: Record<string, AbortController>;
  approvals: ApprovalRequest[];
  mcp: Record<string, McpStatus>;
  toasts: Toast[];
  drawerOpen: boolean;
}

export const useApp = create<AppState>(() => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  providers: [],
  connectors: [],
  projects: [],
  pods: [],
  convs: [],
  messages: {},
  running: {},
  approvals: [],
  mcp: {},
  toasts: [],
  drawerOpen: false,
}));

export const getState = useApp.getState;
const setState = useApp.setState;

// ── bootstrap ──────────────────────────────────────────────

export async function initStore() {
  const [settings, providers, connectors, projects, pods, convs] = await Promise.all([
    DB.kvGet<Partial<Settings>>('settings'),
    DB.getAll('providers'),
    DB.getAll('connectors'),
    DB.getAll('projects'),
    DB.getAll('pods'),
    DB.getAll('convs'),
  ]);
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
    tools: { ...DEFAULT_SETTINGS.tools, ...(settings?.tools ?? {}) },
  };
  setState({
    ready: true,
    settings: merged,
    providers: providers.sort((a, b) => a.createdAt - b.createdAt),
    connectors: connectors.sort((a, b) => a.createdAt - b.createdAt),
    projects: projects.sort((a, b) => b.updatedAt - a.updatedAt),
    pods: pods.sort((a, b) => a.createdAt - b.createdAt),
    convs: convs.sort((a, b) => b.updatedAt - a.updatedAt),
    messages: {},
  });
}

// ── settings ───────────────────────────────────────────────

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...getState().settings, ...patch };
  setState({ settings });
  void DB.kvSet('settings', settings);
}

// ── generic entity helpers ─────────────────────────────────

type ListKey = 'providers' | 'connectors' | 'projects' | 'pods';

function upsertIn<K extends ListKey>(key: K, item: AppState[K][number]) {
  const list = getState()[key] as { id: string }[];
  const idx = list.findIndex((x) => x.id === item.id);
  const next = idx >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
  setState({ [key]: next } as Partial<AppState>);
  void DB.put(key, item as never);
}

function removeIn(key: ListKey, id: string) {
  const list = getState()[key] as { id: string }[];
  setState({ [key]: list.filter((x) => x.id !== id) } as Partial<AppState>);
  void DB.del(key, id);
}

export function upsertProvider(p: Provider) {
  upsertIn('providers', { ...p, updatedAt: now() });
}
export function deleteProvider(id: string) {
  removeIn('providers', id);
}

export function upsertConnector(c: Connector) {
  upsertIn('connectors', { ...c, updatedAt: now() });
}
export function patchConnector(id: string, patch: Partial<Connector>) {
  const c = getState().connectors.find((x) => x.id === id);
  if (c) upsertConnector({ ...c, ...patch });
}
export function deleteConnector(id: string) {
  removeIn('connectors', id);
}

export function upsertProject(p: Project) {
  upsertIn('projects', { ...p, updatedAt: now() });
}
export function deleteProject(id: string) {
  removeIn('projects', id);
  for (const c of getState().convs.filter((c) => c.projectId === id)) {
    updateConv(c.id, { projectId: undefined });
  }
}

export function upsertPod(p: Pod) {
  upsertIn('pods', { ...p, updatedAt: now() });
}
export function deletePod(id: string) {
  removeIn('pods', id);
}

export function setMcpStatus(id: string, status: McpStatus) {
  setState({ mcp: { ...getState().mcp, [id]: { ...status, at: now() } } });
}

// ── conversations ──────────────────────────────────────────

export function createConversation(init: Partial<ConversationMeta>): ConversationMeta {
  const s = getState().settings;
  const conv: ConversationMeta = {
    id: uid('c_'),
    title: '',
    createdAt: now(),
    updatedAt: now(),
    day: today(),
    thinking: s.defaultThinking,
    effort: s.defaultEffort,
    ...init,
  };
  setState({ convs: [conv, ...getState().convs], messages: { ...getState().messages, [conv.id]: [] } });
  void DB.put('convs', conv);
  return conv;
}

export function updateConv(id: string, patch: Partial<ConversationMeta>, touch = false) {
  const convs = getState().convs.map((c) =>
    c.id === id ? { ...c, ...patch, ...(touch ? { updatedAt: now() } : {}) } : c,
  );
  if (touch) convs.sort((a, b) => b.updatedAt - a.updatedAt);
  setState({ convs });
  const conv = convs.find((c) => c.id === id);
  if (conv) void DB.put('convs', conv);
}

export async function deleteConv(id: string) {
  getState().running[id]?.abort();
  const { [id]: _drop, ...rest } = getState().messages;
  void _drop;
  setState({ convs: getState().convs.filter((c) => c.id !== id), messages: rest });
  await DB.del('convs', id);
  await DB.delMessages(id);
}

export async function loadMessages(convId: string): Promise<ChatMessage[]> {
  const cached = getState().messages[convId];
  if (cached) return cached;
  const msgs = await DB.getMessages(convId);
  setState({ messages: { ...getState().messages, [convId]: msgs } });
  return msgs;
}

const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function setMessages(convId: string, msgs: ChatMessage[], persist: 'now' | 'debounced' = 'debounced') {
  setState({ messages: { ...getState().messages, [convId]: msgs } });
  clearTimeout(saveTimers[convId]);
  const save = () => {
    void DB.putMessages(convId, getState().messages[convId] ?? msgs);
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    const preview = (last?.text ?? '').slice(0, 120);
    updateConv(convId, { messageCount: msgs.length, preview });
  };
  if (persist === 'now') save();
  else saveTimers[convId] = setTimeout(save, 500);
}

/** Mutate one message in place (by id) and schedule a save. */
export function patchMessage(convId: string, msgId: string, fn: (m: ChatMessage) => ChatMessage) {
  const msgs = getState().messages[convId];
  if (!msgs) return;
  setMessages(
    convId,
    msgs.map((m) => (m.id === msgId ? fn(m) : m)),
  );
}

// ── run state / approvals / toasts ─────────────────────────

export function setRunning(convId: string, ctrl: AbortController | null) {
  const running = { ...getState().running };
  if (ctrl) running[convId] = ctrl;
  else delete running[convId];
  setState({ running });
}

export function requestApproval(req: Omit<ApprovalRequest, 'resolve'>): Promise<'allow' | 'always' | 'deny'> {
  return new Promise((resolve) => {
    const full: ApprovalRequest = {
      ...req,
      resolve: (d) => {
        setState({ approvals: getState().approvals.filter((a) => a.id !== req.id) });
        resolve(d);
      },
    };
    setState({ approvals: [...getState().approvals, full] });
  });
}

export function cancelApprovals(convId: string) {
  for (const a of getState().approvals.filter((a) => a.convId === convId)) a.resolve('deny');
}

export function toast(text: string, kind: Toast['kind'] = 'info') {
  const t: Toast = { id: uid(), text, kind };
  setState({ toasts: [...getState().toasts, t] });
  setTimeout(() => setState({ toasts: getState().toasts.filter((x) => x.id !== t.id) }), kind === 'error' ? 5000 : 2600);
}

export function setDrawer(open: boolean) {
  setState({ drawerOpen: open });
}
