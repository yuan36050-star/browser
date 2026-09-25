import { openDB, type IDBPDatabase } from 'idb';
import type { ChatMessage, Connector, ConversationMeta, LogEntry, Pod, Project, Provider } from './types';

const DB_NAME = 'cove';
const DB_VERSION = 1;

export type EntityStore = 'providers' | 'connectors' | 'projects' | 'pods' | 'convs';

interface EntityMap {
  providers: Provider;
  connectors: Connector;
  projects: Project;
  pods: Pod;
  convs: ConversationMeta;
}

let dbp: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        for (const s of ['providers', 'connectors', 'projects', 'pods', 'convs']) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('messages')) d.createObjectStore('messages');
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('logs')) {
          const logs = d.createObjectStore('logs', { keyPath: 'id' });
          logs.createIndex('ts', 'ts');
        }
      },
    });
  }
  return dbp;
}

export async function getAll<K extends EntityStore>(store: K): Promise<EntityMap[K][]> {
  return (await db()).getAll(store);
}

export async function put<K extends EntityStore>(store: K, value: EntityMap[K]): Promise<void> {
  await (await db()).put(store, value);
}

export async function del(store: EntityStore, id: string): Promise<void> {
  await (await db()).delete(store, id);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db()).get('kv', key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}

export async function getMessages(convId: string): Promise<ChatMessage[]> {
  return ((await (await db()).get('messages', convId)) as ChatMessage[] | undefined) ?? [];
}

export async function putMessages(convId: string, messages: ChatMessage[]): Promise<void> {
  await (await db()).put('messages', messages, convId);
}

export async function delMessages(convId: string): Promise<void> {
  await (await db()).delete('messages', convId);
}

export async function allMessages(): Promise<Record<string, ChatMessage[]>> {
  const d = await db();
  const keys = (await d.getAllKeys('messages')) as string[];
  const out: Record<string, ChatMessage[]> = {};
  for (const k of keys) out[k] = await d.get('messages', k);
  return out;
}

export async function addLog(entry: LogEntry): Promise<void> {
  await (await db()).put('logs', entry);
}

export async function getLogs(limit = 5000): Promise<LogEntry[]> {
  const d = await db();
  const tx = d.transaction('logs');
  const out: LogEntry[] = [];
  let cursor = await tx.store.index('ts').openCursor(null, 'prev');
  while (cursor && out.length < limit) {
    out.push(cursor.value as LogEntry);
    cursor = await cursor.continue();
  }
  return out;
}

export async function pruneLogs(keep: number): Promise<void> {
  const d = await db();
  const count = await d.count('logs');
  if (count <= keep) return;
  const tx = d.transaction('logs', 'readwrite');
  let toDelete = count - keep;
  let cursor = await tx.store.index('ts').openCursor();
  while (cursor && toDelete > 0) {
    await cursor.delete();
    toDelete--;
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearStore(store: EntityStore | 'messages' | 'logs' | 'kv'): Promise<void> {
  await (await db()).clear(store);
}
