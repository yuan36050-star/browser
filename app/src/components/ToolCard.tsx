import {
  AlertTriangle,
  Ban,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Plug,
  ShieldQuestion,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';
import { useApp } from '../lib/store';
import type { Block, ToolResultPart } from '../lib/types';
import { formatDuration, safeJson } from '../lib/util';
import { Markdown } from './Markdown';
import { Button, cx, Spinner } from './ui';

type ToolBlock = Extract<Block, { type: 'tool_use' }>;

function ResultParts({ parts }: { parts: ToolResultPart[] }) {
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className="tool-output">
      {parts.map((p, i) =>
        p.type === 'image' && p.data ? (
          <img
            key={i}
            className="tool-image"
            src={`data:${p.mime ?? 'image/png'};base64,${p.data}`}
            alt=""
            onClick={() => setZoom(`data:${p.mime ?? 'image/png'};base64,${p.data}`)}
          />
        ) : (
          <pre key={i}>{p.text}</pre>
        ),
      )}
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" />
        </div>
      )}
    </div>
  );
}

function prettyInput(input: unknown): string {
  if (input && typeof input === 'object' && Object.keys(input).length === 1) {
    const [k, v] = Object.entries(input)[0];
    if (typeof v === 'string' && (k === 'code' || v.includes('\n'))) return v;
  }
  return safeJson(input);
}

function summary(b: ToolBlock): string {
  const i = b.input as Record<string, unknown> | undefined;
  if (!i || typeof i !== 'object') return '';
  const first = ['url', 'query', 'pod', 'name', 'title', 'selector', 'path', 'key', 'message', 'id'].find((k) => typeof i[k] === 'string' && i[k]);
  if (first) return String(i[first]).slice(0, 80);
  return '';
}

export function ToolCard({ block }: { block: ToolBlock }) {
  const t = useT();
  const approval = useApp((s) => s.approvals.find((a) => a.id === block.id));
  const awaiting = block.status === 'awaiting' && !!approval;
  const [open, setOpen] = useState(false);
  const expanded = open || awaiting;
  const connector = useApp((s) => (block.source && block.source !== 'app' ? s.connectors.find((c) => c.id === block.source) : undefined));
  const Icon = block.source && block.source !== 'app' ? Plug : Wrench;
  const running = block.status === 'running' || block.status === 'streaming' || block.status === 'pending';
  const hint = summary(block);

  return (
    <div className={cx('tool', `tool-${block.status}`, expanded && 'open')}>
      <button className="tool-head" onClick={() => setOpen(!open)} aria-expanded={expanded}>
        <span className="tool-icon">
          <Icon size={15} />
        </span>
        <span className="tool-name">
          {block.label ?? block.name}
          {hint && <span className="tool-hint">{hint}</span>}
        </span>
        <span className="tool-status">
          {running && <Spinner size={14} />}
          {block.status === 'done' && <Check size={15} />}
          {block.status === 'error' && <AlertTriangle size={15} />}
          {block.status === 'denied' && <Ban size={15} />}
          {block.status === 'awaiting' && <ShieldQuestion size={15} />}
          {block.startedAt && block.endedAt && <span className="tool-time">{formatDuration(block.endedAt - block.startedAt)}</span>}
        </span>
        <ChevronDown size={16} className="chev" />
      </button>
      {expanded && (
        <div className="tool-body">
          {connector && <div className="tool-meta">{connector.name}</div>}
          <div className="tool-section-label">{t('tool.input')}</div>
          <pre className="tool-input">{block.status === 'streaming' ? block.rawInput || '…' : prettyInput(block.input)}</pre>
          {block.result && (
            <>
              <div className="tool-section-label">{block.isError ? t('tool.error') : t('tool.output')}</div>
              <ResultParts parts={block.result} />
            </>
          )}
        </div>
      )}
      {awaiting && approval && (
        <div className="approval">
          <div className="approval-text">
            <ShieldQuestion size={16} />
            <span>{t('tool.approve', { name: block.label ?? block.name })}</span>
          </div>
          <div className="approval-actions">
            <Button size="sm" variant="ghost" onClick={() => approval.resolve('deny')}>
              {t('tool.deny')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => approval.resolve('always')}>
              {t('tool.always')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => approval.resolve('allow')}>
              {t('tool.allow')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ThinkingBlock({ block, live }: { block: Extract<Block, { type: 'thinking' }>; live: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hasText = !!block.text.trim();
  return (
    <div className={cx('thinking', open && 'open', live && 'live')}>
      <button className="thinking-head" onClick={() => hasText && setOpen(!open)} disabled={!hasText && !live}>
        <Brain size={15} />
        <span className={cx(live && 'shimmer-text')}>{live ? t('msg.thinking') : block.redacted ? t('msg.thoughtRedacted') : t('msg.thought')}</span>
        {hasText && <ChevronDown size={15} className="chev" />}
      </button>
      {open && hasText && (
        <div className="thinking-body">
          <Markdown text={block.text} streaming={live} />
        </div>
      )}
    </div>
  );
}

type Json = Record<string, unknown>;

export function NativeBlock({ block }: { block: Extract<Block, { type: 'native' }> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const d = block.data as Json;
  const type = String(d.type);

  if (type === 'fallback') {
    const from = (d.from as Json | undefined)?.model;
    const to = (d.to as Json | undefined)?.model;
    return <div className="notice subtle">{t('msg.fallback', { from: String(from ?? '?'), to: String(to ?? '?') })}</div>;
  }

  if (type === 'server_tool_use' || type === 'mcp_tool_use') {
    const input = (d.input ?? {}) as Json;
    const isSearch = String(d.name).includes('search');
    return (
      <div className={cx('tool', 'tool-done', open && 'open')}>
        <button className="tool-head" onClick={() => setOpen(!open)}>
          <span className="tool-icon">{isSearch ? <Globe size={15} /> : type === 'mcp_tool_use' ? <Plug size={15} /> : <Wrench size={15} />}</span>
          <span className="tool-name">
            {type === 'mcp_tool_use' ? `${String(d.server_name)} · ${String(d.name)}` : isSearch ? t('msg.searchedWeb') : String(d.name)}
            {typeof input.query === 'string' && <span className="tool-hint">{input.query}</span>}
            {typeof input.url === 'string' && <span className="tool-hint">{input.url}</span>}
          </span>
          <ChevronDown size={16} className="chev" />
        </button>
        {open && (
          <div className="tool-body">
            <pre className="tool-input">{safeJson(input)}</pre>
          </div>
        )}
      </div>
    );
  }

  if (type === 'web_search_tool_result') {
    const results = Array.isArray(d.content) ? (d.content as Json[]) : [];
    if (!results.length) return <div className="notice subtle">{t('msg.searchError')}</div>;
    return (
      <div className="sources">
        {results.slice(0, open ? results.length : 4).map((r, i) => {
          let host = '';
          try {
            host = new URL(String(r.url)).hostname.replace(/^www\./, '');
          } catch {
            /* ignore */
          }
          return (
            <a key={i} className="source" href={String(r.url)} target="_blank" rel="noopener noreferrer">
              <span className="source-title">{String(r.title ?? r.url)}</span>
              <span className="source-host">{host}</span>
            </a>
          );
        })}
        {results.length > 4 && (
          <button className="source more" onClick={() => setOpen(!open)}>
            {open ? t('common.showLess') : t('msg.moreSources', { n: results.length - 4 })}
          </button>
        )}
      </div>
    );
  }

  if (type === 'mcp_tool_result') {
    const c = d.content;
    const text = Array.isArray(c) ? (c as Json[]).map((x) => String(x.text ?? '')).join('\n') : String(c ?? '');
    return (
      <div className={cx('tool', d.is_error ? 'tool-error' : 'tool-done', open && 'open')}>
        <button className="tool-head" onClick={() => setOpen(!open)}>
          <span className="tool-icon">
            <Clock size={15} />
          </span>
          <span className="tool-name">{t('tool.output')}</span>
          <ChevronDown size={16} className="chev" />
        </button>
        {open && (
          <div className="tool-body">
            <pre>{text}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cx('tool', 'tool-done', open && 'open')}>
      <button className="tool-head" onClick={() => setOpen(!open)}>
        <span className="tool-icon">
          <Wrench size={15} />
        </span>
        <span className="tool-name">{type}</span>
        <ChevronDown size={16} className="chev" />
      </button>
      {open && (
        <div className="tool-body">
          <pre>{safeJson(d)}</pre>
        </div>
      )}
    </div>
  );
}
