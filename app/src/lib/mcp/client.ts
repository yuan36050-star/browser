import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { logger } from '../logger';
import { resolveSecrets } from '../pods';
import { getState, patchConnector, setMcpStatus } from '../store';
import type { Connector, McpToolInfo, ToolResultPart } from '../types';
import { errorMessage, withCorsProxy } from '../util';
import { BrowserOAuthProvider, clearPending, pendingConnectorForState } from './oauth';

interface Live {
  client: Client;
  transport: Transport;
  sig: string;
  tools?: McpToolInfo[];
}

const live = new Map<string, Live>();
const connecting = new Map<string, Promise<Live>>();

export class AuthRequiredError extends Error {
  constructor(name: string) {
    super(`${name}: sign-in required`);
    this.name = 'AuthRequiredError';
  }
}

function sig(c: Connector): string {
  return JSON.stringify([c.url, c.transport, c.auth, c.token, c.headers, c.useCorsProxy, getState().settings.corsProxy]);
}

function connectorUrl(c: Connector): URL {
  return new URL(withCorsProxy(resolveSecrets(c.url.trim()), getState().settings.corsProxy, c.useCorsProxy));
}

function requestHeaders(c: Connector): Record<string, string> {
  const h: Record<string, string> = {};
  for (const { key, value } of c.headers) if (key.trim()) h[key.trim()] = resolveSecrets(value);
  if (c.auth === 'bearer' && c.token.trim()) h.Authorization = `Bearer ${resolveSecrets(c.token.trim())}`;
  if (c.auth === 'basic' && c.token.trim()) {
    const cred = resolveSecrets(c.token.trim());
    h.Authorization = `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(cred)))}`;
  }
  return h;
}

function makeTransport(c: Connector, kind: 'streamable-http' | 'sse'): Transport {
  const url = connectorUrl(c);
  const requestInit: RequestInit = { headers: requestHeaders(c) };
  const authProvider = c.auth === 'oauth' ? new BrowserOAuthProvider(c.id) : undefined;
  return kind === 'sse'
    ? new SSEClientTransport(url, { requestInit, authProvider })
    : new StreamableHTTPClientTransport(url, { requestInit, authProvider });
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function open(c: Connector): Promise<Live> {
  setMcpStatus(c.id, { state: 'connecting' });
  const kinds: ('streamable-http' | 'sse')[] = c.transport === 'auto' ? ['streamable-http', 'sse'] : [c.transport];
  let lastErr: unknown;
  for (const kind of kinds) {
    const client = new Client({ name: 'cove', version: '0.1.0' }, { capabilities: {} });
    const transport = makeTransport(c, kind);
    try {
      await withTimeout(client.connect(transport), 20000, `Connecting to ${c.name}`);
      const info = client.getServerVersion();
      const entry: Live = { client, transport, sig: sig(c) };
      live.set(c.id, entry);
      setMcpStatus(c.id, { state: 'connected', serverName: info ? `${info.name} ${info.version ?? ''}`.trim() : undefined });
      logger.info('mcp', `Connected to ${c.name} (${kind})`, { url: c.url, server: info });
      client.onclose = () => {
        if (live.get(c.id)?.client === client) live.delete(c.id);
      };
      return entry;
    } catch (e) {
      lastErr = e;
      void client.close().catch(() => undefined);
      if (e instanceof UnauthorizedError || /unauthorized|401/i.test(errorMessage(e))) {
        if (c.auth === 'oauth') {
          setMcpStatus(c.id, { state: 'auth', error: 'Sign-in required' });
          throw new AuthRequiredError(c.name);
        }
        break;
      }
      logger.warn('mcp', `${c.name}: ${kind} failed — ${errorMessage(e)}`);
    }
  }
  const msg = explain(lastErr);
  setMcpStatus(c.id, { state: 'error', error: msg });
  logger.error('mcp', `Could not connect to ${c.name}: ${msg}`, { url: c.url });
  throw new Error(`${c.name}: ${msg}`);
}

function explain(e: unknown): string {
  // Servers and proxies often answer with an HTML error page; keep just its text.
  const m = errorMessage(e)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
  if (/\b401\b|Unauthorized|Authorization Required/i.test(m)) return `${m} — check the connector's credentials.`;
  if (/Failed to fetch|NetworkError|Load failed|TypeError/i.test(m)) {
    return `${m} — the server may be unreachable or may not allow browser (CORS) requests. Enable CORS on the server, turn on the CORS proxy, or use API mode with an Anthropic provider.`;
  }
  return m;
}

export async function connect(c: Connector): Promise<Live> {
  const cur = live.get(c.id);
  if (cur && cur.sig === sig(c)) return cur;
  if (cur) await disconnect(c.id);
  const inflight = connecting.get(c.id);
  if (inflight) return inflight;
  const p = open(c).finally(() => connecting.delete(c.id));
  connecting.set(c.id, p);
  return p;
}

export async function disconnect(id: string) {
  const cur = live.get(id);
  live.delete(id);
  if (cur) await cur.client.close().catch(() => undefined);
  setMcpStatus(id, { state: 'idle' });
}

export async function listTools(c: Connector, refresh = false): Promise<McpToolInfo[]> {
  const l = await connect(c);
  if (l.tools && !refresh) return l.tools;
  const tools: McpToolInfo[] = [];
  let cursor: string | undefined;
  do {
    const res = await l.client.listTools(cursor ? { cursor } : undefined);
    for (const t of res.tools) {
      tools.push({
        name: t.name,
        title: t.title ?? t.annotations?.title,
        description: t.description,
        inputSchema: (t.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
        readOnly: t.annotations?.readOnlyHint === true,
      });
    }
    cursor = res.nextCursor;
  } while (cursor);
  l.tools = tools;
  patchConnector(c.id, { toolCache: tools });
  return tools;
}

type McpContent = { type: string; text?: string; data?: string; mimeType?: string; resource?: { uri?: string; text?: string; blob?: string; mimeType?: string }; uri?: string; name?: string };

function convertContent(content: McpContent[]): ToolResultPart[] {
  const parts: ToolResultPart[] = [];
  for (const c of content) {
    if (c.type === 'text') parts.push({ type: 'text', text: c.text ?? '' });
    else if (c.type === 'image' && c.data) parts.push({ type: 'image', data: c.data, mime: c.mimeType ?? 'image/png' });
    else if (c.type === 'audio') parts.push({ type: 'text', text: `[audio ${c.mimeType ?? ''} omitted]` });
    else if (c.type === 'resource' && c.resource) {
      if (c.resource.text !== undefined) parts.push({ type: 'text', text: `[resource ${c.resource.uri ?? ''}]\n${c.resource.text}` });
      else if (c.resource.blob && c.resource.mimeType?.startsWith('image/')) parts.push({ type: 'image', data: c.resource.blob, mime: c.resource.mimeType });
      else parts.push({ type: 'text', text: `[binary resource ${c.resource.uri ?? ''} ${c.resource.mimeType ?? ''}]` });
    } else if (c.type === 'resource_link') parts.push({ type: 'text', text: `[resource link] ${c.name ?? ''} ${c.uri ?? ''}` });
    else parts.push({ type: 'text', text: JSON.stringify(c) });
  }
  return parts;
}

export async function callTool(
  c: Connector,
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<{ parts: ToolResultPart[]; isError: boolean }> {
  const attempt = async () => {
    const l = await connect(c);
    return l.client.callTool({ name, arguments: args }, undefined, {
      signal,
      timeout: 5 * 60 * 1000,
      resetTimeoutOnProgress: true,
    });
  };
  let res;
  try {
    res = await attempt();
  } catch (e) {
    if (signal.aborted) throw e;
    // Stale session (server restarted) → reconnect once.
    if (/session|404|not found|closed|terminated/i.test(errorMessage(e))) {
      await disconnect(c.id);
      res = await attempt();
    } else throw e;
  }
  const content = (res.content ?? []) as McpContent[];
  let parts = convertContent(content);
  if (!parts.length && res.structuredContent) parts = [{ type: 'text', text: JSON.stringify(res.structuredContent, null, 2) }];
  if (!parts.length && 'toolResult' in res) parts = [{ type: 'text', text: JSON.stringify(res.toolResult, null, 2) }];
  return { parts, isError: res.isError === true };
}

/** Completes an OAuth flow after the provider redirected back with ?code&state. */
export async function finishOAuth(state: string, code: string): Promise<string | undefined> {
  const id = pendingConnectorForState(state);
  clearPending(state);
  const c = getState().connectors.find((x) => x.id === id);
  if (!c) return undefined;
  const kind = c.transport === 'sse' ? 'sse' : 'streamable-http';
  const t = makeTransport(c, kind) as StreamableHTTPClientTransport | SSEClientTransport;
  await t.finishAuth(code);
  logger.info('mcp', `Signed in to ${c.name}`);
  await disconnect(c.id);
  const fresh = getState().connectors.find((x) => x.id === id)!;
  await listTools(fresh, true);
  return c.name;
}

export function oauthAccessToken(c: Connector): string | undefined {
  const t = c.oauth?.tokens as { access_token?: string } | undefined;
  return t?.access_token;
}
