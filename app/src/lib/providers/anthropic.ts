import Anthropic from '@anthropic-ai/sdk';
import { textAttachmentBlock } from '../files';
import type { Block, ChatMessage, ModelInfo, Provider, ToolResultPart, Usage } from '../types';
import { trimBase, withCorsProxy } from '../util';
import {
  budgetThinking,
  modernClaude,
  ProviderError,
  stepsOf,
  supportsEffort,
  toolOutcome,
  type StreamParams,
  type StreamResult,
} from './common';

type Json = Record<string, unknown>;

function isOfficial(p: Provider): boolean {
  try {
    return new URL(p.baseURL).hostname.endsWith('anthropic.com');
  } catch {
    return false;
  }
}

/** Custom fetch: drops SDK telemetry headers for third-party hosts (strict CORS allow-lists reject them). */
function makeFetch(p: Provider): typeof fetch {
  const official = isOfficial(p);
  return (input, init) => {
    if (!official && init?.headers) {
      const h = new Headers(init.headers as HeadersInit);
      for (const k of [...h.keys()]) {
        if (k.startsWith('x-stainless') || k === 'anthropic-dangerous-direct-browser-access') h.delete(k);
      }
      init = { ...init, headers: h };
    }
    return fetch(input, init);
  };
}

export function makeClient(p: Provider, apiKey: string, corsProxy: string): Anthropic {
  const headers: Record<string, string> = {};
  for (const { key, value } of p.headers) if (key.trim()) headers[key.trim()] = value;
  const bearer = p.authStyle === 'bearer';
  return new Anthropic({
    apiKey: bearer ? null : apiKey || 'none',
    authToken: bearer ? apiKey || 'none' : null,
    baseURL: withCorsProxy(trimBase(p.baseURL || 'https://api.anthropic.com', true), corsProxy, p.useCorsProxy),
    dangerouslyAllowBrowser: true,
    defaultHeaders: headers,
    maxRetries: 1,
    timeout: 15 * 60 * 1000,
    fetch: makeFetch(p),
  });
}

export async function listModels(p: Provider, apiKey: string, corsProxy: string): Promise<ModelInfo[]> {
  const client = makeClient(p, apiKey, corsProxy);
  const out: ModelInfo[] = [];
  for await (const m of client.models.list({ limit: 100 })) {
    out.push({ id: m.id, label: m.display_name });
  }
  return out;
}

function mediaBlock(kind: 'image' | 'pdf', mime: string, data: string, name?: string): Json {
  if (kind === 'image') return { type: 'image', source: { type: 'base64', media_type: mime, data } };
  return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data }, ...(name ? { title: name } : {}) };
}

function userContent(m: ChatMessage): Json[] {
  const content: Json[] = [];
  for (const a of m.attachments ?? []) {
    if (a.kind === 'image' && a.data) content.push(mediaBlock('image', a.mime, a.data));
    else if (a.kind === 'pdf' && a.data) content.push(mediaBlock('pdf', a.mime, a.data, a.name));
  }
  for (const a of m.attachments ?? []) {
    if (a.kind === 'text') content.push({ type: 'text', text: textAttachmentBlock(a) });
    else if (a.kind === 'binary') content.push({ type: 'text', text: `[Attached file: ${a.name} (${a.mime}, ${a.size} bytes) — binary content not included]` });
  }
  if (m.text?.trim()) content.push({ type: 'text', text: m.text });
  if (!content.length) content.push({ type: 'text', text: '(empty message)' });
  return content;
}

function resultContent(parts: ToolResultPart[]): Json[] {
  const out: Json[] = [];
  for (const p of parts) {
    if (p.type === 'image' && p.data) out.push(mediaBlock('image', p.mime ?? 'image/png', p.data));
    else if (p.type === 'text') out.push({ type: 'text', text: p.text || '(empty)' });
  }
  return out.length ? out : [{ type: 'text', text: '(no output)' }];
}

function nativeSummary(d: Json): string {
  const t = String(d.type);
  if (t === 'server_tool_use' || t === 'mcp_tool_use') return `[${t} ${String(d.name)} ${JSON.stringify(d.input ?? {})}]`;
  if (t === 'web_search_tool_result' && Array.isArray(d.content)) {
    return `[web search results]\n${(d.content as Json[]).map((r) => `- ${String(r.title ?? '')} ${String(r.url ?? '')}`).join('\n')}`;
  }
  if (t === 'mcp_tool_result') {
    const c = d.content;
    const text = Array.isArray(c) ? (c as Json[]).map((x) => String(x.text ?? '')).join('\n') : String(c ?? '');
    return `[mcp tool result]\n${text.slice(0, 4000)}`;
  }
  return '';
}

interface ConvertOpts {
  replayNative: (d: Json) => boolean;
  stripThinking: boolean;
}

function assistantStepContent(m: ChatMessage, step: Block[], opts: ConvertOpts): Json[] {
  const content: Json[] = [];
  const sameKind = m.providerKind === 'anthropic';
  // After a mid-output fallback, blocks before the last fallback marker (except text) are not echoed.
  const lastFallback = step.map((b) => b.type === 'native' && b.data.type === 'fallback').lastIndexOf(true);
  step.forEach((b, i) => {
    const beforeBoundary = i < lastFallback;
    if (b.type === 'text') {
      if (b.text) content.push({ type: 'text', text: b.text });
    } else if (b.type === 'thinking') {
      if (!sameKind || opts.stripThinking || beforeBoundary) return;
      if (b.redacted) content.push({ type: 'redacted_thinking', data: b.redacted });
      else if (b.signature) content.push({ type: 'thinking', thinking: b.text, signature: b.signature });
    } else if (b.type === 'tool_use') {
      if (beforeBoundary) return;
      const input = b.input && typeof b.input === 'object' && !Array.isArray(b.input) ? b.input : {};
      content.push({ type: 'tool_use', id: b.id, name: b.name, input });
    } else if (b.type === 'native') {
      if (b.data.type === 'fallback') return;
      if (sameKind && opts.replayNative(b.data)) content.push(b.data);
      else {
        const s = nativeSummary(b.data);
        if (s) content.push({ type: 'text', text: s });
      }
    }
  });
  return content;
}

export function convertMessages(history: ChatMessage[], knowledge: StreamParams['knowledge'], opts: ConvertOpts): Json[] {
  const out: Json[] = [];
  let firstUser = true;
  for (const m of history) {
    if (m.role === 'user') {
      const content = userContent(m);
      if (firstUser && knowledge.media.length) {
        content.unshift(
          ...knowledge.media.map((k) => mediaBlock(k.kind, k.mime, k.data, k.name)),
          { type: 'text', text: '(The files above are project knowledge.)' },
        );
      }
      firstUser = false;
      out.push({ role: 'user', content });
      continue;
    }
    for (const step of stepsOf(m)) {
      const content = assistantStepContent(m, step, opts);
      if (!content.length) continue;
      out.push({ role: 'assistant', content });
      const toolUses = content.filter((c) => c.type === 'tool_use');
      if (toolUses.length) {
        const results = toolUses.map((tu) => {
          const b = step.find((x) => x.type === 'tool_use' && x.id === tu.id) as Extract<Block, { type: 'tool_use' }>;
          const { parts, isError } = toolOutcome(b);
          return { type: 'tool_result', tool_use_id: b.id, content: resultContent(parts), ...(isError ? { is_error: true } : {}) };
        });
        out.push({ role: 'user', content: results });
      }
    }
  }
  return out;
}

function addCacheBreakpoint(messages: Json[]) {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || !Array.isArray(last.content)) return;
  const content = last.content as Json[];
  const block = content[content.length - 1];
  if (block && ['text', 'image', 'document', 'tool_result'].includes(String(block.type))) {
    content[content.length - 1] = { ...block, cache_control: { type: 'ephemeral' } };
  }
}

export function buildRequest(sp: StreamParams): { body: Json; betas: string[] } {
  const p = sp.provider;
  const betas = p.betas.split(',').map((s) => s.trim()).filter(Boolean);
  const tools: Json[] = sp.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
  const useServer = p.serverTools;
  if (useServer && sp.webSearch) {
    tools.push({ type: modernClaude(sp.model) ? 'web_search_20260209' : 'web_search_20250305', name: 'web_search', max_uses: 8 });
  }
  const mcpServers = useServer ? sp.mcpServers : [];
  for (const s of mcpServers) tools.push({ type: 'mcp_toolset', mcp_server_name: s.name });
  if (mcpServers.length && !betas.includes('mcp-client-2025-11-20')) betas.push('mcp-client-2025-11-20');

  const replayNative = (d: Json) => {
    const t = String(d.type);
    if (t.startsWith('mcp_')) return mcpServers.some((s) => s.name === d.server_name);
    if (t === 'server_tool_use') return !!(useServer && sp.webSearch) || String(d.name).startsWith('web_');
    if (t.startsWith('web_')) return !!(useServer && sp.webSearch);
    return true;
  };
  const messages = convertMessages(sp.history, sp.knowledge, { replayNative, stripThinking: !!sp.stripThinking });
  if (p.promptCaching) addCacheBreakpoint(messages);

  let maxTokens = p.maxTokens || sp.maxTokens;
  if (/claude-3(?!-7)/.test(sp.model)) maxTokens = Math.min(maxTokens, 8192);
  const body: Json = { model: sp.model, max_tokens: maxTokens, messages, stream: true };
  const system = [sp.system, sp.knowledge.systemText].filter(Boolean).join('\n\n');
  if (system) {
    body.system = [{ type: 'text', text: system, ...(p.promptCaching ? { cache_control: { type: 'ephemeral' } } : {}) }];
  }
  if (tools.length) body.tools = tools;
  if (mcpServers.length) body.mcp_servers = mcpServers.map((s) => ({ type: 'url', ...s }));
  if (sp.thinking) {
    if (budgetThinking(sp.model)) {
      body.thinking = { type: 'enabled', budget_tokens: Math.max(1024, Math.min(16000, maxTokens - 2048)) };
    } else {
      body.thinking = { type: 'adaptive', display: 'summarized' };
    }
  }
  if (sp.effort !== 'default' && supportsEffort(sp.model)) body.output_config = { effort: sp.effort };
  if (sp.temperature !== undefined && !sp.thinking && !modernClaude(sp.model)) body.temperature = sp.temperature;
  if (p.refusalFallback && /fable|mythos|opus-5/.test(sp.model)) {
    body.fallbacks = 'default';
    if (!betas.includes('server-side-fallback-2026-07-01')) betas.push('server-side-fallback-2026-07-01');
  }
  if (p.extraBody.trim()) {
    try {
      Object.assign(body, JSON.parse(p.extraBody));
    } catch {
      /* validated in the editor */
    }
  }
  return { body, betas };
}

export async function streamAnthropic(sp: StreamParams): Promise<StreamResult> {
  const client = makeClient(sp.provider, sp.apiKey, sp.corsProxy);
  const { body, betas } = buildRequest(sp);
  const blocks: Block[] = [];
  const indexMap = new Map<number, number>();
  const partial = new Map<number, string>();
  const usage: Usage = { input: 0, output: 0 };
  let stopReason = 'end_turn';
  let stopDetails: unknown;
  let model: string | undefined;
  let started = false;
  const emit = () => sp.onUpdate(blocks.slice());

  let stream: AsyncIterable<Json>;
  try {
    const opts = { signal: sp.signal };
    stream = (betas.length
      ? await client.beta.messages.create({ ...body, betas } as never, opts)
      : await client.messages.create(body as never, opts)) as unknown as AsyncIterable<Json>;
  } catch (e) {
    throw wrapError(e, true);
  }

  try {
    for await (const ev of stream) {
      started = true;
      switch (ev.type) {
        case 'message_start': {
          const msg = ev.message as Json;
          model = msg.model as string;
          const u = (msg.usage ?? {}) as Json;
          usage.input = Number(u.input_tokens ?? 0);
          usage.cacheRead = Number(u.cache_read_input_tokens ?? 0);
          usage.cacheWrite = Number(u.cache_creation_input_tokens ?? 0);
          usage.output = Number(u.output_tokens ?? 0);
          break;
        }
        case 'content_block_start': {
          const cb = ev.content_block as Json;
          const idx = ev.index as number;
          let block: Block;
          if (cb.type === 'text') block = { type: 'text', step: sp.step, text: String(cb.text ?? '') };
          else if (cb.type === 'thinking') block = { type: 'thinking', step: sp.step, text: String(cb.thinking ?? ''), signature: (cb.signature as string) || undefined };
          else if (cb.type === 'redacted_thinking') block = { type: 'thinking', step: sp.step, text: '', redacted: String(cb.data ?? '') };
          else if (cb.type === 'tool_use') block = { type: 'tool_use', step: sp.step, id: String(cb.id), name: String(cb.name), input: {}, rawInput: '', status: 'streaming' };
          else block = { type: 'native', step: sp.step, provider: 'anthropic', data: { ...cb } };
          indexMap.set(idx, blocks.length);
          blocks.push(block);
          emit();
          break;
        }
        case 'content_block_delta': {
          const pos = indexMap.get(ev.index as number);
          if (pos === undefined) break;
          const b = blocks[pos];
          const d = ev.delta as Json;
          if (d.type === 'text_delta' && b.type === 'text') blocks[pos] = { ...b, text: b.text + String(d.text) };
          else if (d.type === 'thinking_delta' && b.type === 'thinking') blocks[pos] = { ...b, text: b.text + String(d.thinking) };
          else if (d.type === 'signature_delta' && b.type === 'thinking') blocks[pos] = { ...b, signature: String(d.signature) };
          else if (d.type === 'citations_delta' && b.type === 'text') blocks[pos] = { ...b, citations: [...(b.citations ?? []), d.citation] };
          else if (d.type === 'input_json_delta') {
            if (b.type === 'tool_use') blocks[pos] = { ...b, rawInput: (b.rawInput ?? '') + String(d.partial_json) };
            else partial.set(pos, (partial.get(pos) ?? '') + String(d.partial_json));
          }
          emit();
          break;
        }
        case 'content_block_stop': {
          const pos = indexMap.get(ev.index as number);
          if (pos === undefined) break;
          const b = blocks[pos];
          if (b.type === 'tool_use') {
            let input: unknown = {};
            let status: 'pending' | 'error' = 'pending';
            try {
              input = b.rawInput?.trim() ? JSON.parse(b.rawInput) : {};
            } catch {
              input = { INVALID_JSON: b.rawInput };
              status = 'error';
            }
            blocks[pos] = {
              ...b,
              input,
              status,
              ...(status === 'error' ? { isError: true, result: [{ type: 'text', text: JSON.stringify({ INVALID_JSON: b.rawInput }) }] } : {}),
            };
          } else if (b.type === 'native' && partial.has(pos)) {
            try {
              blocks[pos] = { ...b, data: { ...b.data, input: JSON.parse(partial.get(pos) || '{}') } };
            } catch {
              /* keep as-is */
            }
          }
          emit();
          break;
        }
        case 'message_delta': {
          const d = ev.delta as Json;
          if (d.stop_reason) stopReason = String(d.stop_reason);
          if (d.stop_details) stopDetails = d.stop_details;
          const u = (ev.usage ?? {}) as Json;
          if (u.output_tokens !== undefined) usage.output = Number(u.output_tokens);
          if (u.input_tokens) usage.input = Number(u.input_tokens);
          if (u.cache_read_input_tokens) usage.cacheRead = Number(u.cache_read_input_tokens);
          if (u.cache_creation_input_tokens) usage.cacheWrite = Number(u.cache_creation_input_tokens);
          break;
        }
        default:
          break;
      }
    }
  } catch (e) {
    throw wrapError(e, !started);
  }
  // An aborted SDK stream ends quietly instead of throwing.
  if (sp.signal.aborted) throw new DOMException('Aborted', 'AbortError');

  // Mid-output fallback: the declined partial's tool calls must never run.
  const lastFallback = blocks.map((b) => b.type === 'native' && b.data.type === 'fallback').lastIndexOf(true);
  const finalBlocks = lastFallback > 0
    ? blocks.filter((b, i) => i >= lastFallback || b.type === 'text' || b.type === 'native')
    : blocks;
  return { blocks: finalBlocks, stopReason, usage, model, stopDetails, requestBody: sp.logBodies ? { ...body, betas } : undefined };
}

function wrapError(e: unknown, beforeStream: boolean): unknown {
  if (e instanceof Anthropic.APIUserAbortError) return e;
  if (e instanceof Anthropic.APIError) {
    const status = typeof e.status === 'number' ? e.status : 0;
    const err = e.error as Json | undefined;
    const innerErr = (err?.error as Json | undefined) ?? err;
    const inner = innerErr?.message;
    const msg = typeof inner === 'string' ? inner : e.message;
    const label = status || (typeof innerErr?.type === 'string' ? innerErr.type : 'Error');
    // Mid-stream "error" events carry no HTTP status; overloaded/api errors are worth another key.
    const effective = status || (/overloaded|api_error|rate_limit/.test(String(innerErr?.type)) ? 529 : 0);
    return new ProviderError(`${label} · ${msg}`, effective, JSON.stringify(e.error ?? {}), beforeStream);
  }
  if (e instanceof Error && e.name === 'AbortError') return e;
  if (e instanceof TypeError) {
    return new ProviderError(`Network error: ${e.message} (CORS or connectivity — see Settings › Network)`, 0, undefined, beforeStream);
  }
  return e;
}
