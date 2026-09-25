import { logger } from '../logger';
import * as MCP from '../mcp/client';
import { resolveSecrets } from '../pods';
import type { ApiMcpServer } from '../providers';
import { getState } from '../store';
import type { Connector, ConversationMeta, Project, Provider } from '../types';
import { errorMessage, hash, slug } from '../util';
import { builtinTools } from './builtin';
import type { ToolDef } from './types';

export interface ToolSet {
  tools: ToolDef[];
  byName: Map<string, ToolDef>;
  apiMcp: ApiMcpServer[];
  warnings: string[];
}

function apiName(connector: Connector, tool: string): string {
  const base = `${slug(connector.name, 20)}__${tool.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  if (base.length <= 64) return base;
  return `${base.slice(0, 55)}_${hash(base).slice(0, 8)}`;
}

export function activeConnectors(project?: Project): Connector[] {
  const all = getState().connectors;
  if (project?.connectorIds) return all.filter((c) => project.connectorIds!.includes(c.id));
  return all.filter((c) => c.enabled);
}

function schemaOf(s: Record<string, unknown>): Record<string, unknown> {
  // Anthropic and OpenAI both require an object schema at the top level.
  if (s && s.type === 'object') return s;
  return { type: 'object', properties: (s?.properties as object) ?? {}, ...(s?.required ? { required: s.required } : {}) };
}

export async function gatherTools(conv: ConversationMeta, project: Project | undefined, provider: Provider): Promise<ToolSet> {
  const tools: ToolDef[] = [...builtinTools()];
  const apiMcp: ApiMcpServer[] = [];
  const warnings: string[] = [];
  const connectors = activeConnectors(project);

  // Resolve connectors in parallel but keep their tools in connector order,
  // so the tool list is byte-stable between turns (prompt caching).
  const perConnector = await Promise.all(
    connectors.map(async (c): Promise<ToolDef[]> => {
      if (c.mode === 'api' && provider.kind === 'anthropic' && provider.serverTools) {
        // The API-side MCP connector only takes bearer tokens.
        const token = c.auth === 'bearer' ? resolveSecrets(c.token.trim()) : c.auth === 'oauth' ? MCP.oauthAccessToken(c) : undefined;
        apiMcp.push({ name: slug(c.name, 40), url: resolveSecrets(c.url.trim()), ...(token ? { authorization_token: token } : {}) });
        return [];
      }
      try {
        const list = await MCP.listTools(c);
        return list
          .filter((t) => !c.disabledTools.includes(t.name))
          .map((t) => ({
            name: apiName(c, t.name),
            description: (t.description ?? t.title ?? t.name).slice(0, 4000),
            inputSchema: schemaOf(t.inputSchema),
            source: c.id,
            label: `${c.name} · ${t.title ?? t.name}`,
            readOnly: !!t.readOnly,
            run: async (input, ctx) => {
              const fresh = getState().connectors.find((x) => x.id === c.id) ?? c;
              const r = await MCP.callTool(fresh, t.name, input, ctx.signal);
              if (r.isError) throw Object.assign(new Error('tool error'), { parts: r.parts });
              return r.parts;
            },
          }));
      } catch (e) {
        warnings.push(errorMessage(e));
        return [];
      }
    }),
  );
  for (const list of perConnector) tools.push(...list);
  apiMcp.sort((a, b) => a.name.localeCompare(b.name));
  const byName = new Map(tools.map((t) => [t.name, t]));
  if (warnings.length) logger.warn('mcp', `Some connectors are unavailable for chat ${conv.id}`, warnings, conv.id);
  return { tools, byName, apiMcp, warnings };
}

export function needsApproval(def: ToolDef): boolean {
  const s = getState().settings;
  if (s.permissionMode === 'auto') return false;
  if (s.alwaysAllow.includes(def.name)) return false;
  if (def.source !== 'app') {
    const c = getState().connectors.find((x) => x.id === def.source);
    if (c?.autoApprove) return false;
  }
  if (s.permissionMode === 'auto-read' && def.readOnly) return false;
  return true;
}
