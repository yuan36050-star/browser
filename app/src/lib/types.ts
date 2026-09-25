// Core data model. Everything here is persisted in IndexedDB (see db.ts).

export type ProviderKind = 'anthropic' | 'openai';

export interface ModelInfo {
  id: string;
  label?: string;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  /** Base URL. Anthropic: https://api.anthropic.com  OpenAI-compatible: https://host/v1 */
  baseURL: string;
  /** Key pool. Several keys rotate on failure (or round-robin). Values may be {{pod:NAME/KEY}} references. */
  apiKeys: string[];
  keyStrategy: 'failover' | 'round-robin';
  /** Anthropic only: send the key as x-api-key (default) or Authorization: Bearer. */
  authStyle: 'x-api-key' | 'bearer';
  headers: KeyValue[];
  models: ModelInfo[];
  /** JSON merged into every request body (advanced). */
  extraBody: string;
  /** Anthropic only: comma separated anthropic-beta flags added to every request. */
  betas: string;
  /** Anthropic only: add cache_control breakpoints (prompt caching). */
  promptCaching: boolean;
  /** Anthropic only: allow the API-side MCP connector + server tools (web search). */
  serverTools: boolean;
  /** Anthropic only: server-side refusal fallback (fallbacks: "default") on models that support it. */
  refusalFallback: boolean;
  /** OpenAI only: request usage in the final stream chunk. */
  streamUsage: boolean;
  /** Route requests through the global CORS proxy. */
  useCorsProxy: boolean;
  /** Per-provider max output tokens (0 = Anthropic: app setting, OpenAI: server default). */
  maxTokens?: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ConnectorAuth = 'none' | 'bearer' | 'basic' | 'oauth';

export interface OAuthState {
  tokens?: Record<string, unknown>;
  clientInformation?: Record<string, unknown>;
  codeVerifier?: string;
  state?: string;
}

export interface Connector {
  id: string;
  name: string;
  url: string;
  transport: 'auto' | 'streamable-http' | 'sse';
  auth: ConnectorAuth;
  token: string;
  headers: KeyValue[];
  /** client: this browser talks to the MCP server. api: Anthropic's MCP connector does (Anthropic providers only). */
  mode: 'client' | 'api';
  enabled: boolean;
  /** Skip permission prompts for this connector's tools. */
  autoApprove: boolean;
  disabledTools: string[];
  useCorsProxy: boolean;
  oauth?: OAuthState;
  /** Cached tool list from the last successful connection. */
  toolCache?: McpToolInfo[];
  createdAt: number;
  updatedAt: number;
}

export interface McpToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  readOnly?: boolean;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Extracted/plain text for text-like files. */
  text?: string;
  /** Base64 payload for images and PDFs. */
  data?: string;
  addedAt: number;
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  description: string;
  instructions: string;
  files: KnowledgeFile[];
  providerId?: string;
  model?: string;
  /** Connector ids enabled for chats in this project. undefined = inherit global enabled flags. */
  connectorIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/** AI access level for a pod. */
export type PodAccess = 'none' | 'use' | 'read' | 'write';

export interface PodEntry {
  key: string;
  value: string;
  updatedAt: number;
  updatedBy: 'user' | 'ai';
}

export interface Pod {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Secret pods hide values in the UI until revealed. */
  secret: boolean;
  /** Pinned pods are included in the context of every new conversation. */
  pinned?: boolean;
  aiAccess: PodAccess;
  entries: PodEntry[];
  createdAt: number;
  updatedAt: number;
  createdBy: 'user' | 'ai';
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: 'image' | 'pdf' | 'text' | 'binary';
  /** base64 (no data: prefix) for image/pdf/binary */
  data?: string;
  /** text content for text files */
  text?: string;
  /** small data-url preview for images */
  preview?: string;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export type ToolStatus = 'streaming' | 'pending' | 'awaiting' | 'running' | 'done' | 'error' | 'denied';

export interface ToolResultPart {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mime?: string;
}

export type Block =
  | { type: 'text'; step: number; text: string; citations?: unknown[] }
  | { type: 'thinking'; step: number; text: string; signature?: string; redacted?: string }
  | {
      type: 'tool_use';
      step: number;
      id: string;
      name: string;
      input: unknown;
      rawInput?: string;
      /** 'app' for built-in tools, connector id for MCP tools */
      source?: string;
      label?: string;
      status: ToolStatus;
      result?: ToolResultPart[];
      isError?: boolean;
      startedAt?: number;
      endedAt?: number;
    }
  /** Provider-native blocks we must replay verbatim (Anthropic server tools, MCP connector, fallback, compaction). */
  | { type: 'native'; step: number; provider: 'anthropic'; data: Record<string, unknown> };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  createdAt: number;
  text?: string;
  attachments?: Attachment[];
  blocks?: Block[];
  providerId?: string;
  providerKind?: ProviderKind;
  model?: string;
  usage?: Usage;
  stopReason?: string;
  status?: 'streaming' | 'done' | 'error' | 'stopped';
  error?: string;
  durationMs?: number;
}

export interface ConversationMeta {
  id: string;
  title: string;
  projectId?: string;
  providerId?: string;
  model?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  /** YYYY-MM-DD, frozen at creation so the system prompt stays byte-stable. */
  day: string;
  /** Pinned-pod context captured at the first message (kept stable for caching). */
  contextSnapshot?: string;
  thinking?: boolean;
  effort?: Effort;
  webSearch?: boolean;
  usage?: Usage;
  messageCount?: number;
  preview?: string;
}

export type Effort = 'default' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type PermissionMode = 'ask' | 'auto-read' | 'auto';

export interface Settings {
  language: 'auto' | 'en' | 'zh';
  theme: 'system' | 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg';
  assistantFont: 'serif' | 'sans';
  /** Liquid Glass intensity: 0.35 (jelly) … 0.85 (solid). */
  glassAlpha: number;
  enterToSend: 'auto' | 'enter' | 'mod-enter';
  defaultProviderId?: string;
  defaultModel?: string;
  userName: string;
  systemPrompt: string;
  permissionMode: PermissionMode;
  alwaysAllow: string[];
  aiCanSeeKeys: boolean;
  tools: {
    pods: boolean;
    manage: boolean;
    logs: boolean;
    history: boolean;
    javascript: boolean;
    fetch: boolean;
  };
  autoTitle: boolean;
  defaultThinking: boolean;
  defaultEffort: Effort;
  maxTokens: number;
  maxSteps: number;
  temperature: string;
  logBodies: boolean;
  logRetention: number;
  corsProxy: string;
  onboarded: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'request' | 'tool' | 'mcp' | 'app' | 'ai';

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  convId?: string;
}
