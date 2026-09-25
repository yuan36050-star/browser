import { getState, upsertPod } from './store';
import type { Pod, PodAccess, PodEntry } from './types';
import { now, uid } from './util';

export const POD_REF = /\{\{\s*pod:([^/}]+)\/([^}]+?)\s*\}\}/g;

export function findPod(ref: string): Pod | undefined {
  const r = ref.trim().toLowerCase();
  return getState().pods.find((p) => p.id === ref || p.name.toLowerCase() === r);
}

/**
 * Replace {{pod:NAME/KEY}} references with pod values.
 * When `forAi` is set (the string came from a model tool call) the pod must allow at least 'use'.
 */
export function resolveSecrets(s: string, forAi = false): string {
  if (!s || !s.includes('{{')) return s;
  return s.replace(POD_REF, (whole, podName: string, key: string) => {
    const pod = findPod(podName);
    if (!pod) return whole;
    if (forAi && pod.aiAccess === 'none') return whole;
    const entry = pod.entries.find((e) => e.key === key.trim());
    return entry ? entry.value : whole;
  });
}

export function canRead(p: Pod): boolean {
  return p.aiAccess === 'read' || p.aiAccess === 'write';
}

export function canWrite(p: Pod): boolean {
  return p.aiAccess === 'write';
}

export function newPod(init: Partial<Pod> & { name: string }, by: 'user' | 'ai' = 'user'): Pod {
  return {
    id: uid('p_'),
    emoji: '📦',
    description: '',
    secret: false,
    aiAccess: 'write' as PodAccess,
    entries: [],
    createdAt: now(),
    updatedAt: now(),
    createdBy: by,
    ...init,
  };
}

export function writeEntry(pod: Pod, key: string, value: string, by: 'user' | 'ai'): Pod {
  const entry: PodEntry = { key, value, updatedAt: now(), updatedBy: by };
  const idx = pod.entries.findIndex((e) => e.key === key);
  const entries = idx >= 0 ? pod.entries.map((e, i) => (i === idx ? entry : e)) : [...pod.entries, entry];
  const next = { ...pod, entries };
  upsertPod(next);
  return next;
}

export function removeEntry(pod: Pod, key: string): Pod {
  const next = { ...pod, entries: pod.entries.filter((e) => e.key !== key) };
  upsertPod(next);
  return next;
}
