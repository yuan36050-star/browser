import { logger } from '../logger';
import { resolveSecrets } from '../pods';
import { getState } from '../store';
import type { ModelInfo, Provider, ProviderKind } from '../types';
import { isAbort, now, uid } from '../util';
import * as A from './anthropic';
import { ProviderError, type StreamParams, type StreamResult } from './common';
import * as O from './openai';

export { ProviderError } from './common';
export type { StreamParams, StreamResult, ToolSpec, ApiMcpServer, KnowledgeParts } from './common';

export interface ProviderPreset {
  id: string;
  name: string;
  kind: ProviderKind;
  baseURL: string;
  models: string[];
}

export const PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    models: ['claude-opus-5', 'claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5-1', 'claude-haiku-4-5'],
  },
  {
    id: 'cc-bridge',
    name: 'cc-bridge',
    kind: 'openai',
    baseURL: 'http://localhost:8000/v1',
    models: ['sonnet', 'opus'],
  },
  { id: 'openai', name: 'OpenAI', kind: 'openai', baseURL: 'https://api.openai.com/v1', models: [] },
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseURL: 'https://openrouter.ai/api/v1', models: [] },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai', baseURL: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'gemini', name: 'Gemini (OpenAI-compatible)', kind: 'openai', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', models: [] },
  { id: 'ollama', name: 'Ollama / LM Studio', kind: 'openai', baseURL: 'http://localhost:11434/v1', models: [] },
  { id: 'custom-anthropic', name: 'Custom (Anthropic format)', kind: 'anthropic', baseURL: '', models: [] },
  { id: 'custom-openai', name: 'Custom (OpenAI format)', kind: 'openai', baseURL: '', models: [] },
];

export function newProvider(preset?: ProviderPreset): Provider {
  const official = preset?.id === 'anthropic';
  return {
    id: uid('pv_'),
    name: preset?.name.replace(/^Custom \((.*)\)$/, 'My provider') ?? 'My provider',
    kind: preset?.kind ?? 'openai',
    baseURL: preset?.baseURL ?? '',
    apiKeys: [''],
    keyStrategy: 'failover',
    authStyle: 'x-api-key',
    headers: [],
    models: (preset?.models ?? []).map((id) => ({ id })),
    extraBody: '',
    betas: '',
    promptCaching: preset?.kind === 'anthropic',
    serverTools: official,
    refusalFallback: official,
    streamUsage: true,
    useCorsProxy: false,
    enabled: true,
    createdAt: now(),
    updatedAt: now(),
  };
}

const rrCounters: Record<string, number> = {};
const lastGood: Record<string, number> = {};

function keyOrder(p: Provider): string[] {
  const keys = p.apiKeys.map((k) => resolveSecrets(k.trim())).filter((k, i, arr) => arr.indexOf(k) === i);
  if (!keys.length) return [''];
  let start = 0;
  if (p.keyStrategy === 'round-robin') {
    start = (rrCounters[p.id] = ((rrCounters[p.id] ?? -1) + 1) % keys.length);
  } else start = lastGood[p.id] ?? 0;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

export async function streamChat(
  params: Omit<StreamParams, 'apiKey' | 'corsProxy' | 'logBodies'>,
  convId?: string,
): Promise<StreamResult> {
  const { provider: p } = params;
  const s = getState().settings;
  const keys = keyOrder(p);
  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const started = now();
    const meta = {
      provider: p.name,
      kind: p.kind,
      baseURL: p.baseURL,
      model: params.model,
      step: params.step,
      key: keys.length > 1 ? `#${p.apiKeys.map((k) => resolveSecrets(k.trim())).indexOf(apiKey) + 1}/${keys.length}` : undefined,
      messages: params.history.length,
      tools: params.tools.length,
      mcpServers: params.mcpServers.length || undefined,
    };
    try {
      const full: StreamParams = { ...params, apiKey, corsProxy: s.corsProxy, logBodies: s.logBodies };
      const res = p.kind === 'anthropic' ? await A.streamAnthropic(full) : await O.streamOpenAI(full);
      lastGood[p.id] = p.apiKeys.map((k) => resolveSecrets(k.trim())).indexOf(apiKey);
      logger.info(
        'request',
        `${p.name} · ${res.model ?? params.model} → ${res.stopReason}`,
        { ...meta, durationMs: now() - started, stopReason: res.stopReason, usage: res.usage, stopDetails: res.stopDetails, body: res.requestBody },
        convId,
      );
      return res;
    } catch (e) {
      lastErr = e;
      if (isAbort(e) || params.signal.aborted) {
        logger.info('request', `${p.name} · ${params.model} aborted`, { ...meta, durationMs: now() - started }, convId);
        throw e;
      }
      const pe = e instanceof ProviderError ? e : undefined;
      logger.error('request', `${p.name} · ${params.model} failed: ${pe?.message ?? (e as Error).message}`, { ...meta, durationMs: now() - started, status: pe?.status, body: pe?.body }, convId);
      if (!pe?.rotatable || i === keys.length - 1) throw e;
      logger.warn('request', `Rotating to next API key for ${p.name}`, undefined, convId);
    }
  }
  throw lastErr;
}

export async function fetchModels(p: Provider): Promise<ModelInfo[]> {
  const s = getState().settings;
  const key = keyOrder(p)[0];
  const models = p.kind === 'anthropic' ? await A.listModels(p, key, s.corsProxy) : await O.listModels(p, key, s.corsProxy);
  logger.info('request', `Fetched ${models.length} models from ${p.name}`);
  return models;
}

export async function testProvider(p: Provider, model: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await streamChat({
      provider: p,
      model,
      system: '',
      history: [{ id: 't', role: 'user', createdAt: now(), text: 'Reply with just: pong' }],
      knowledge: { systemText: '', media: [] },
      tools: [],
      mcpServers: [],
      webSearch: false,
      thinking: false,
      effort: 'default',
      maxTokens: 256,
      step: 0,
      signal: ctrl.signal,
      onUpdate: () => undefined,
    });
    const text = res.blocks.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    return text || `(${res.stopReason})`;
  } finally {
    clearTimeout(timer);
  }
}

export function providerModels(p: Provider): ModelInfo[] {
  return p.models;
}

export function isThinkingSignatureError(e: unknown): boolean {
  return e instanceof ProviderError && e.status === 400 && /thinking|signature|prefix|block_binding/i.test(e.message);
}
