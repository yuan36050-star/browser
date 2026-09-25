import type { ToolResultPart } from '../types';

export interface ToolCtx {
  convId: string;
  signal: AbortSignal;
}

export interface ToolDef {
  /** Name sent to the model. */
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** 'app' for built-ins, connector id for MCP tools. */
  source: string;
  /** Human label, e.g. "Pods · write" or "browser · navigate". */
  label: string;
  readOnly: boolean;
  group?: string;
  run: (input: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolResultPart[] | string>;
}

export function obj(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return { type: 'object', properties, required, additionalProperties: false };
}

export const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
export const num = (description: string) => ({ type: 'number', description });
export const bool = (description: string) => ({ type: 'boolean', description });
