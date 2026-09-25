import * as DB from './db';
import { getState, initStore } from './store';
import { downloadFile, today } from './util';

export interface BackupFile {
  app: 'cove';
  version: 1;
  exportedAt: string;
  settings: unknown;
  providers: unknown[];
  connectors: unknown[];
  projects: unknown[];
  pods: unknown[];
  convs: unknown[];
  messages: Record<string, unknown>;
  logs?: unknown[];
}

export async function exportAll(opts: { includeKeys: boolean; includeLogs: boolean }) {
  const st = getState();
  const providers = st.providers.map((p) => (opts.includeKeys ? p : { ...p, apiKeys: p.apiKeys.map(() => '') }));
  const connectors = st.connectors.map((c) => (opts.includeKeys ? c : { ...c, token: '', oauth: undefined }));
  const pods = st.pods.map((p) => (opts.includeKeys || !p.secret ? p : { ...p, entries: p.entries.map((e) => ({ ...e, value: '' })) }));
  const data: BackupFile = {
    app: 'cove',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: st.settings,
    providers,
    connectors,
    projects: st.projects,
    pods,
    convs: st.convs,
    messages: await DB.allMessages(),
    logs: opts.includeLogs ? await DB.getLogs(100000) : undefined,
  };
  downloadFile(`cove-backup-${today()}.json`, JSON.stringify(data));
}

export async function importAll(file: File, mode: 'merge' | 'replace') {
  const data = JSON.parse(await file.text()) as BackupFile;
  if (data.app !== 'cove') throw new Error('Not a Cove backup file');
  if (mode === 'replace') {
    for (const s of ['providers', 'connectors', 'projects', 'pods', 'convs', 'messages', 'kv'] as const) await DB.clearStore(s);
  }
  if (data.settings && mode === 'replace') await DB.kvSet('settings', data.settings);
  for (const p of data.providers ?? []) await DB.put('providers', p as never);
  for (const c of data.connectors ?? []) await DB.put('connectors', c as never);
  for (const p of data.projects ?? []) await DB.put('projects', p as never);
  for (const p of data.pods ?? []) await DB.put('pods', p as never);
  for (const c of data.convs ?? []) await DB.put('convs', c as never);
  for (const [id, msgs] of Object.entries(data.messages ?? {})) await DB.putMessages(id, msgs as never);
  for (const l of data.logs ?? []) await DB.addLog(l as never);
  await initStore();
}

export async function wipeAll() {
  for (const s of ['providers', 'connectors', 'projects', 'pods', 'convs', 'messages', 'kv', 'logs'] as const) await DB.clearStore(s);
  localStorage.clear();
  await initStore();
}
