import { addLog, pruneLogs } from './db';
import { getState } from './store';
import type { LogCategory, LogEntry, LogLevel } from './types';
import { uid } from './util';

type Listener = (e: LogEntry) => void;
const listeners = new Set<Listener>();
let writes = 0;

export function onLog(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Shrinks big payloads (base64 images, long strings) before they are stored. */
export function scrub(v: unknown, depth = 0): unknown {
  if (depth > 8) return '…';
  if (typeof v === 'string') {
    if (v.length > 400 && /^[A-Za-z0-9+/=\s]+$/.test(v.slice(0, 400))) return `[base64 ${v.length} chars]`;
    if (v.startsWith('data:') && v.length > 200) return `[data-url ${v.length} chars]`;
    return v.length > 8000 ? v.slice(0, 8000) + `…[+${v.length - 8000}]` : v;
  }
  if (Array.isArray(v)) return v.slice(0, 200).map((x) => scrub(x, depth + 1));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (/^(x-api-key|authorization|api[-_]?key|apikey|token|password|secret)$/i.test(k) && typeof val === 'string') {
        out[k] = val ? '••••' : '';
      } else out[k] = scrub(val, depth + 1);
    }
    return out;
  }
  return v;
}

export function log(level: LogLevel, category: LogCategory, message: string, data?: unknown, convId?: string) {
  const entry: LogEntry = {
    id: uid('l_'),
    ts: Date.now(),
    level,
    category,
    message,
    data: data === undefined ? undefined : scrub(data),
    convId,
  };
  for (const l of listeners) l(entry);
  void addLog(entry).then(() => {
    if (++writes % 50 === 0) void pruneLogs(getState().settings.logRetention);
  });
  if (level === 'error') console.warn(`[${category}] ${message}`, data ?? '');
}

export const logger = {
  debug: (c: LogCategory, m: string, d?: unknown, conv?: string) => log('debug', c, m, d, conv),
  info: (c: LogCategory, m: string, d?: unknown, conv?: string) => log('info', c, m, d, conv),
  warn: (c: LogCategory, m: string, d?: unknown, conv?: string) => log('warn', c, m, d, conv),
  error: (c: LogCategory, m: string, d?: unknown, conv?: string) => log('error', c, m, d, conv),
};
