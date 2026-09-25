import type { Block, ChatMessage, Effort, Provider, ToolResultPart, Usage } from '../types';

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ApiMcpServer {
  name: string;
  url: string;
  authorization_token?: string;
}

export interface KnowledgeParts {
  /** Text appended to the system prompt. */
  systemText: string;
  /** Images / PDFs prepended to the first user message. */
  media: { name: string; mime: string; data: string; kind: 'image' | 'pdf' }[];
}

export interface StreamParams {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  history: ChatMessage[];
  knowledge: KnowledgeParts;
  tools: ToolSpec[];
  mcpServers: ApiMcpServer[];
  webSearch: boolean;
  thinking: boolean;
  effort: Effort;
  maxTokens: number;
  temperature?: number;
  step: number;
  signal: AbortSignal;
  corsProxy: string;
  logBodies: boolean;
  /** Strip replayed thinking blocks (recovery after a thinking-signature 400). */
  stripThinking?: boolean;
  onUpdate: (blocks: Block[]) => void;
}

export interface StreamResult {
  blocks: Block[];
  stopReason: string;
  usage: Usage;
  model?: string;
  stopDetails?: unknown;
  requestBody?: unknown;
}

export class ProviderError extends Error {
  status: number;
  body?: string;
  /** true if nothing was streamed yet, so another key may be tried. */
  beforeStream: boolean;
  constructor(message: string, status: number, body?: string, beforeStream = true) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.body = body;
    this.beforeStream = beforeStream;
  }
  get rotatable(): boolean {
    return this.beforeStream && (this.status === 401 || this.status === 403 || this.status === 429 || this.status >= 500 || this.status === 0);
  }
}

export function extractErrorMessage(body: string, fallback: string): string {
  try {
    const j = JSON.parse(body);
    const m = j?.error?.message ?? j?.message ?? j?.detail ?? j?.error;
    if (typeof m === 'string' && m) return m;
  } catch {
    /* not json */
  }
  return body?.trim() ? body.trim().slice(0, 500) : fallback;
}

export function toolResultText(parts: ToolResultPart[] | undefined): string {
  if (!parts?.length) return '(no output)';
  return parts
    .map((p) => (p.type === 'text' ? p.text ?? '' : `[image ${p.mime ?? ''}]`))
    .join('\n')
    .trim() || '(no output)';
}

/** Tool result payload for a tool_use block, including synthetic results for denied/interrupted calls. */
export function toolOutcome(b: Extract<Block, { type: 'tool_use' }>): { parts: ToolResultPart[]; isError: boolean } {
  if (b.status === 'denied') return { parts: [{ type: 'text', text: 'The user denied this tool call.' }], isError: true };
  if (b.status === 'done' || b.status === 'error') {
    return { parts: b.result?.length ? b.result : [{ type: 'text', text: '(no output)' }], isError: !!b.isError || b.status === 'error' };
  }
  return { parts: [{ type: 'text', text: 'The tool call was interrupted before it finished.' }], isError: true };
}

/** Groups an assistant message's blocks by agent step. */
export function stepsOf(m: ChatMessage): Block[][] {
  const out = new Map<number, Block[]>();
  for (const b of m.blocks ?? []) {
    const arr = out.get(b.step) ?? [];
    arr.push(b);
    out.set(b.step, arr);
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
}

/** Minimal SSE reader (for OpenAI-compatible streams). */
export async function* readSSE(res: Response, signal: AbortSignal): AsyncGenerator<{ event?: string; data: string }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const onAbort = () => reader.cancel().catch(() => undefined);
  signal.addEventListener('abort', onAbort);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.search(/\r?\n\r?\n/)) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx).replace(/^\r?\n\r?\n/, '');
        let event: string | undefined;
        const data: string[] = [];
        for (const line of raw.split(/\r?\n/)) {
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
          else if (line.startsWith('event:')) event = line.slice(6).trim();
        }
        if (data.length) yield { event, data: data.join('\n') };
      }
    }
    if (buf.trim().startsWith('data:')) yield { data: buf.trim().slice(5).trim() };
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export function modernClaude(model: string): boolean {
  return /(opus-(4-[678]|5)|sonnet-(4-6|5)|fable|mythos)/i.test(model);
}

export function budgetThinking(model: string): boolean {
  return /claude-3|haiku-4|(sonnet|opus)-4-[0125]\b|(sonnet|opus)-4-(0|1|5)-|(sonnet|opus)-4-2025|claude-(sonnet|opus)-4$/i.test(model);
}

export function supportsEffort(model: string): boolean {
  return !/claude-3|haiku|sonnet-4-5|sonnet-4-0|sonnet-4-2025|opus-4-[01]/i.test(model);
}
