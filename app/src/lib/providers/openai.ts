import { textAttachmentBlock } from '../files';
import type { Block, ChatMessage, ModelInfo, Provider, Usage } from '../types';
import { trimBase, withCorsProxy } from '../util';
import {
  extractErrorMessage,
  ProviderError,
  readSSE,
  stepsOf,
  toolOutcome,
  toolResultText,
  type StreamParams,
  type StreamResult,
} from './common';

type Json = Record<string, unknown>;

function endpoint(p: Provider, path: string, corsProxy: string): string {
  let base = trimBase(p.baseURL);
  if (!/\/v\d+[a-z]*$/.test(base) && !/\/(openai|api|compatible-mode)(\/|$)/.test(base)) base += '/v1';
  return withCorsProxy(base + path, corsProxy, p.useCorsProxy);
}

function headers(p: Provider, apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  for (const { key, value } of p.headers) if (key.trim()) h[key.trim()] = value;
  return h;
}

export async function listModels(p: Provider, apiKey: string, corsProxy: string): Promise<ModelInfo[]> {
  const res = await fetch(endpoint(p, '/models', corsProxy), { headers: headers(p, apiKey) });
  const text = await res.text();
  if (!res.ok) throw new ProviderError(`${res.status} · ${extractErrorMessage(text, res.statusText)}`, res.status, text);
  const j = JSON.parse(text);
  const arr = (Array.isArray(j) ? j : j.data ?? j.models ?? []) as Json[];
  return arr
    .map((m) => ({ id: String(m.id ?? m.name ?? ''), label: (m.name as string) || undefined }))
    .filter((m) => m.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function dataUrl(mime: string, data: string) {
  return `data:${mime};base64,${data}`;
}

function userContent(m: ChatMessage, extra: Json[] = []): string | Json[] {
  const parts: Json[] = [...extra];
  for (const a of m.attachments ?? []) {
    if (a.kind === 'image' && a.data) parts.push({ type: 'image_url', image_url: { url: dataUrl(a.mime, a.data) } });
    else if (a.kind === 'pdf' && a.data) parts.push({ type: 'file', file: { filename: a.name, file_data: dataUrl('application/pdf', a.data) } });
    else if (a.kind === 'text') parts.push({ type: 'text', text: textAttachmentBlock(a) });
    else if (a.kind === 'binary') parts.push({ type: 'text', text: `[Attached file: ${a.name} (${a.mime}, ${a.size} bytes) — binary content not included]` });
  }
  if (!parts.length) return m.text || '(empty message)';
  if (m.text?.trim()) parts.push({ type: 'text', text: m.text });
  return parts;
}

function nativeText(d: Json): string {
  const t = String(d.type);
  if (t === 'web_search_tool_result' && Array.isArray(d.content)) {
    return `[web search results]\n${(d.content as Json[]).map((r) => `- ${String(r.title ?? '')} ${String(r.url ?? '')}`).join('\n')}`;
  }
  if (t === 'mcp_tool_result') {
    const c = d.content;
    return `[tool result] ${Array.isArray(c) ? (c as Json[]).map((x) => String(x.text ?? '')).join('\n') : String(c ?? '')}`.slice(0, 4000);
  }
  if (t === 'server_tool_use' || t === 'mcp_tool_use') return `[called ${String(d.name)} ${JSON.stringify(d.input ?? {})}]`;
  return '';
}

export function convertMessages(system: string, history: ChatMessage[], knowledge: StreamParams['knowledge']): Json[] {
  const out: Json[] = [];
  const sys = [system, knowledge.systemText].filter(Boolean).join('\n\n');
  if (sys) out.push({ role: 'system', content: sys });
  let firstUser = true;
  for (const m of history) {
    if (m.role === 'user') {
      const extra: Json[] = [];
      if (firstUser && knowledge.media.length) {
        for (const k of knowledge.media) {
          extra.push(
            k.kind === 'image'
              ? { type: 'image_url', image_url: { url: dataUrl(k.mime, k.data) } }
              : { type: 'file', file: { filename: k.name, file_data: dataUrl('application/pdf', k.data) } },
          );
        }
        extra.push({ type: 'text', text: '(The files above are project knowledge.)' });
      }
      firstUser = false;
      out.push({ role: 'user', content: userContent(m, extra) });
      continue;
    }
    for (const step of stepsOf(m)) {
      const text = step
        .map((b) => (b.type === 'text' ? b.text : b.type === 'native' ? nativeText(b.data) : ''))
        .filter(Boolean)
        .join('\n\n');
      const tus = step.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
      if (!text && !tus.length) continue;
      const msg: Json = { role: 'assistant', content: text || (tus.length ? null : '') };
      if (tus.length) {
        msg.tool_calls = tus.map((t) => ({
          id: t.id,
          type: 'function',
          function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) },
        }));
      }
      out.push(msg);
      const images: Json[] = [];
      for (const t of tus) {
        const { parts, isError } = toolOutcome(t);
        out.push({ role: 'tool', tool_call_id: t.id, content: (isError ? 'ERROR: ' : '') + toolResultText(parts) });
        for (const p of parts) {
          if (p.type === 'image' && p.data) images.push({ type: 'image_url', image_url: { url: dataUrl(p.mime ?? 'image/png', p.data) } });
        }
      }
      if (images.length) out.push({ role: 'user', content: [{ type: 'text', text: '[Images returned by the tool calls above]' }, ...images] });
    }
  }
  return out;
}

export async function streamOpenAI(sp: StreamParams): Promise<StreamResult> {
  const p = sp.provider;
  const body: Json = {
    model: sp.model,
    messages: convertMessages(sp.system, sp.history, sp.knowledge),
    stream: true,
  };
  if (p.streamUsage) body.stream_options = { include_usage: true };
  if (sp.tools.length) {
    body.tools = sp.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
  }
  // Many OpenAI-compatible servers reject large or legacy max_tokens values, so it is opt-in per provider.
  if (p.maxTokens) body.max_tokens = p.maxTokens;
  if (sp.temperature !== undefined) body.temperature = sp.temperature;
  if (sp.thinking && sp.effort !== 'default') body.reasoning_effort = sp.effort === 'xhigh' || sp.effort === 'max' ? 'high' : sp.effort;
  if (p.extraBody.trim()) {
    try {
      Object.assign(body, JSON.parse(p.extraBody));
    } catch {
      /* validated in editor */
    }
  }

  let res: Response;
  try {
    res = await fetch(endpoint(p, '/chat/completions', sp.corsProxy), {
      method: 'POST',
      headers: headers(p, sp.apiKey),
      body: JSON.stringify(body),
      signal: sp.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ProviderError(`Network error: ${(e as Error).message} (CORS or connectivity — see Settings › Network)`, 0);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(`${res.status} · ${extractErrorMessage(text, res.statusText)}`, res.status, text);
  }

  const blocks: Block[] = [];
  const usage: Usage = { input: 0, output: 0 };
  let stopReason = 'end_turn';
  let model: string | undefined;
  const toolIdx = new Map<number, number>();
  let inThinkTag = false;
  const emit = () => sp.onUpdate(blocks.slice());

  const appendText = (type: 'text' | 'thinking', s: string) => {
    if (!s) return;
    const last = blocks[blocks.length - 1];
    if (last && last.type === type) blocks[blocks.length - 1] = { ...last, text: last.text + s };
    else blocks.push(type === 'text' ? { type: 'text', step: sp.step, text: s } : { type: 'thinking', step: sp.step, text: s });
  };

  // Some models inline reasoning as <think>…</think> in the content stream.
  const appendContent = (s: string) => {
    let rest = s;
    while (rest) {
      if (inThinkTag) {
        const end = rest.indexOf('</think>');
        if (end < 0) {
          appendText('thinking', rest);
          return;
        }
        appendText('thinking', rest.slice(0, end));
        inThinkTag = false;
        rest = rest.slice(end + 8);
      } else {
        const start = rest.indexOf('<think>');
        const noText = !blocks.some((b) => b.type === 'text' && b.text.trim());
        if (start < 0 || !noText) {
          appendText('text', rest);
          return;
        }
        appendText('text', rest.slice(0, start));
        inThinkTag = true;
        rest = rest.slice(start + 7);
      }
    }
  };

  try {
    for await (const { data } of readSSE(res, sp.signal)) {
      if (data === '[DONE]') break;
      let j: Json;
      try {
        j = JSON.parse(data);
      } catch {
        continue;
      }
      if (j.error) {
        const err = j.error as Json;
        throw new ProviderError(`Stream error · ${String(err.message ?? JSON.stringify(err))}`, Number(err.code) || 500, data, blocks.length === 0);
      }
      if (j.model) model = String(j.model);
      if (j.usage) {
        const u = j.usage as Json;
        usage.input = Number(u.prompt_tokens ?? u.input_tokens ?? usage.input);
        usage.output = Number(u.completion_tokens ?? u.output_tokens ?? usage.output);
        const details = u.prompt_tokens_details as Json | undefined;
        if (details?.cached_tokens) usage.cacheRead = Number(details.cached_tokens);
      }
      const choice = (j.choices as Json[] | undefined)?.[0];
      if (!choice) continue;
      const delta = (choice.delta ?? choice.message ?? {}) as Json;
      const reasoning = delta.reasoning_content ?? delta.reasoning;
      if (typeof reasoning === 'string') appendText('thinking', reasoning);
      if (typeof delta.content === 'string') appendContent(delta.content);
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls as Json[]) {
          const i = Number(tc.index ?? 0);
          const fn = (tc.function ?? {}) as Json;
          let pos = toolIdx.get(i);
          if (pos === undefined) {
            pos = blocks.length;
            toolIdx.set(i, pos);
            blocks.push({
              type: 'tool_use',
              step: sp.step,
              id: String(tc.id ?? `call_${Date.now().toString(36)}_${i}`),
              name: String(fn.name ?? ''),
              input: {},
              rawInput: '',
              status: 'streaming',
            });
          }
          const b = blocks[pos] as Extract<Block, { type: 'tool_use' }>;
          blocks[pos] = {
            ...b,
            id: tc.id ? String(tc.id) : b.id,
            name: b.name || String(fn.name ?? ''),
            rawInput: (b.rawInput ?? '') + String(fn.arguments ?? ''),
          };
        }
      }
      if (choice.finish_reason) {
        const fr = String(choice.finish_reason);
        stopReason = fr === 'tool_calls' || fr === 'function_call' ? 'tool_use' : fr === 'length' ? 'max_tokens' : fr === 'stop' ? 'end_turn' : fr;
      }
      emit();
    }
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Error && e.name === 'AbortError') throw e;
    if (sp.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new ProviderError(`Stream interrupted: ${(e as Error).message}`, 0, undefined, blocks.length === 0);
  }

  // Cancelling the reader ends the stream quietly instead of throwing.
  if (sp.signal.aborted) throw new DOMException('Aborted', 'AbortError');

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== 'tool_use') continue;
    try {
      blocks[i] = { ...b, input: b.rawInput?.trim() ? JSON.parse(b.rawInput) : {}, status: 'pending' };
    } catch {
      blocks[i] = { ...b, input: { INVALID_JSON: b.rawInput }, status: 'error', isError: true, result: [{ type: 'text', text: JSON.stringify({ INVALID_JSON: b.rawInput }) }] };
    }
  }
  if (blocks.some((b) => b.type === 'tool_use') && stopReason === 'end_turn') stopReason = 'tool_use';
  emit();
  return { blocks, stopReason, usage, model, requestBody: sp.logBodies ? body : undefined };
}
