import { AlertCircle, Check, Copy, FileText, Pencil, RotateCcw, Square } from 'lucide-react';
import { memo, useState } from 'react';
import { useT } from '../i18n';
import { editAndResend, regenerate } from '../lib/agent';
import { navigate } from '../lib/router';
import type { Attachment, Block, ChatMessage } from '../lib/types';
import { copyText, formatBytes, formatDuration, formatTokens } from '../lib/util';
import { Markdown } from './Markdown';
import { NativeBlock, ThinkingBlock, ToolCard } from './ToolCard';
import { Button, cx, IconButton, TextArea } from './ui';

export function AttachmentChip({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
  const t = useT();
  const [zoom, setZoom] = useState(false);
  if (a.kind === 'image' && (a.preview || a.data)) {
    const src = a.preview ?? `data:${a.mime};base64,${a.data}`;
    return (
      <div className="att att-image">
        <img src={src} alt={a.name} onClick={() => setZoom(true)} />
        {onRemove && (
          <button className="att-x" aria-label={t('common.remove')} onClick={onRemove}>
            ×
          </button>
        )}
        {zoom && (
          <div className="lightbox" onClick={() => setZoom(false)}>
            <img src={a.data ? `data:${a.mime};base64,${a.data}` : src} alt={a.name} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="att att-file">
      <span className="att-file-icon">
        <FileText size={18} />
      </span>
      <span className="att-file-main">
        <span className="att-name">{a.name}</span>
        <span className="att-meta">
          {a.kind === 'pdf' ? 'PDF' : a.kind === 'text' ? (a.name.split('.').pop() ?? 'text').toUpperCase() : 'FILE'} · {formatBytes(a.size)}
        </span>
      </span>
      {onRemove && (
        <button className="att-x" aria-label={t('common.remove')} onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <IconButton
      label={t('common.copy')}
      onClick={() =>
        void copyText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        })
      }
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
    </IconButton>
  );
}

export const UserMessage = memo(function UserMessage({ m, convId, busy }: { m: ChatMessage; convId: string; busy: boolean }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.text ?? '');
  return (
    <div className="msg msg-user">
      {!!m.attachments?.length && (
        <div className="msg-atts">
          {m.attachments.map((a) => (
            <AttachmentChip key={a.id} a={a} />
          ))}
        </div>
      )}
      {editing ? (
        <div className="edit-box">
          <TextArea autoGrow value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus rows={2} />
          <div className="edit-actions">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={busy || (!draft.trim() && !m.attachments?.length)}
              onClick={() => {
                setEditing(false);
                void editAndResend(convId, m.id, draft, m.attachments ?? []);
              }}
            >
              {t('msg.sendEdit')}
            </Button>
          </div>
        </div>
      ) : (
        m.text && <div className="bubble">{m.text}</div>
      )}
      {!editing && (
        <div className="msg-actions user">
          {m.text && <CopyButton text={m.text} />}
          <IconButton
            label={t('common.edit')}
            disabled={busy}
            onClick={() => {
              setDraft(m.text ?? '');
              setEditing(true);
            }}
          >
            <Pencil size={15} />
          </IconButton>
        </div>
      )}
    </div>
  );
});

function blockKey(b: Block, i: number) {
  return b.type === 'tool_use' ? b.id : `${b.type}-${b.step}-${i}`;
}

function ErrorCard({ m, convId }: { m: ChatMessage; convId: string }) {
  const t = useT();
  if (m.error === 'NO_PROVIDER') {
    return (
      <div className="notice error">
        <AlertCircle size={16} />
        <div>
          <strong>{t('err.noProvider')}</strong>
          <p>{t('err.noProviderText')}</p>
          <Button size="sm" variant="primary" onClick={() => navigate('/providers')}>
            {t('providers.add')}
          </Button>
        </div>
      </div>
    );
  }
  if (m.error === 'NO_MODEL') {
    return (
      <div className="notice error">
        <AlertCircle size={16} />
        <div>
          <strong>{t('err.noModel')}</strong>
          <p>{t('err.noModelText')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="notice error">
      <AlertCircle size={16} />
      <div>
        <strong>{t('err.request')}</strong>
        <p className="mono-wrap">{m.error}</p>
        <div className="notice-actions">
          <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => void regenerate(convId, m.id)}>
            {t('common.retry')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/logs')}>
            {t('nav.logs')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const AssistantMessage = memo(function AssistantMessage({
  m,
  convId,
  isLast,
  busy,
}: {
  m: ChatMessage;
  convId: string;
  isLast: boolean;
  busy: boolean;
}) {
  const t = useT();
  const blocks = m.blocks ?? [];
  const streaming = m.status === 'streaming';
  const text = blocks
    .filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
  const lastBlock = blocks[blocks.length - 1];
  const waiting =
    streaming &&
    (!blocks.length ||
      (lastBlock?.type === 'tool_use' && ['done', 'error', 'denied'].includes(lastBlock.status)) ||
      lastBlock?.type === 'native');

  let refusal: string | undefined;
  if (m.stopReason === 'refusal') {
    try {
      refusal = (JSON.parse(m.error ?? '{}') as { explanation?: string }).explanation;
    } catch {
      refusal = undefined;
    }
  }

  return (
    <div className={cx('msg', 'msg-assistant', streaming && 'streaming')}>
      {blocks.map((b, i) => {
        const live = streaming && i === blocks.length - 1;
        if (b.type === 'text') return b.text ? <Markdown key={blockKey(b, i)} text={b.text} streaming={live} /> : null;
        if (b.type === 'thinking') return <ThinkingBlock key={blockKey(b, i)} block={b} live={live} />;
        if (b.type === 'tool_use') return <ToolCard key={blockKey(b, i)} block={b} />;
        return <NativeBlock key={blockKey(b, i)} block={b} />;
      })}
      {waiting && (
        <div className="typing" aria-label={t('msg.working')}>
          <span />
          <span />
          <span />
        </div>
      )}
      {m.status === 'error' && <ErrorCard m={m} convId={convId} />}
      {m.stopReason === 'refusal' && (
        <div className="notice warn">
          <AlertCircle size={16} />
          <div>
            <strong>{t('msg.refusal')}</strong>
            {refusal && <p>{refusal}</p>}
          </div>
        </div>
      )}
      {m.stopReason === 'max_tokens' && m.status !== 'error' && <div className="notice subtle">{t('msg.maxTokens')}</div>}
      {m.status === 'stopped' && (
        <div className="stopped">
          <Square size={11} /> {t('msg.stopped')}
        </div>
      )}
      {!streaming && m.status !== 'error' && (
        <div className={cx('msg-actions', isLast && 'always')}>
          {text && <CopyButton text={text} />}
          <IconButton label={t('msg.regenerate')} disabled={busy} onClick={() => void regenerate(convId, m.id)}>
            <RotateCcw size={15} />
          </IconButton>
          <span className="msg-info">
            {[m.model, m.usage && `${formatTokens(m.usage.input + (m.usage.cacheRead ?? 0) + (m.usage.cacheWrite ?? 0))} → ${formatTokens(m.usage.output)}`, m.durationMs && formatDuration(m.durationMs)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
});
