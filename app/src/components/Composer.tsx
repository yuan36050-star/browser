import { ArrowUp, Brain, Camera, ChevronDown, FileUp, Globe, Image as ImageIcon, Plus, SlidersHorizontal, Square } from 'lucide-react';
import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { useT } from '../i18n';
import { resolveModel, resolveProvider } from '../lib/agent';
import { pickFiles, readAttachment } from '../lib/files';
import { activeConnectors } from '../lib/tools/registry';
import { toast, useApp } from '../lib/store';
import type { Attachment, ConversationMeta, Effort } from '../lib/types';
import { errorMessage, isMobile } from '../lib/util';
import { ChatOptions } from './ChatOptions';
import { AttachmentChip } from './Message';
import { ModelPicker } from './ModelPicker';
import { cx, IconButton, Menu, Spinner, useMenu } from './ui';

export type ChatOpts = Pick<ConversationMeta, 'providerId' | 'model' | 'thinking' | 'effort' | 'webSearch' | 'projectId'>;

const DRAFT_KEY = 'cove.draft.';

export function Composer({
  draftKey,
  opts,
  onOpts,
  onSend,
  busy,
  onStop,
  addFilesRef,
}: {
  draftKey: string;
  opts: ChatOpts;
  onOpts: (patch: Partial<ChatOpts>) => void;
  onSend: (text: string, atts: Attachment[]) => void;
  busy: boolean;
  onStop: () => void;
  addFilesRef?: React.MutableRefObject<((files: File[]) => void) | null>;
}) {
  const t = useT();
  const settings = useApp((s) => s.settings);
  const providers = useApp((s) => s.providers);
  const project = useApp((s) => (opts.projectId ? s.projects.find((p) => p.id === opts.projectId) : undefined));
  const connectorsOn = useApp(() => activeConnectors(project).length);
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY + draftKey) ?? '';
    } catch {
      return '';
    }
  });
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const attachMenu = useMenu();
  const ta = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Publish the floating composer's height so the message list can clear it.
  useEffect(() => {
    const el = wrapRef.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const ro = new ResizeObserver(() => host.style.setProperty('--composer-h', `${Math.round(el.offsetHeight)}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const provider = resolveProvider(opts);
  const model = resolveModel(provider, opts);
  const thinking = opts.thinking ?? settings.defaultThinking;
  const effort: Effort = opts.effort ?? settings.defaultEffort;
  void providers;

  useEffect(() => {
    try {
      if (text) localStorage.setItem(DRAFT_KEY + draftKey, text);
      else localStorage.removeItem(DRAFT_KEY + draftKey);
    } catch {
      /* storage unavailable */
    }
  }, [text, draftKey]);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [text]);

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    setLoading((n) => n + files.length);
    for (const f of files) {
      try {
        const a = await readAttachment(f);
        setAtts((prev) => [...prev, a]);
      } catch (e) {
        toast(errorMessage(e), 'error');
      } finally {
        setLoading((n) => n - 1);
      }
    }
  };
  if (addFilesRef) addFilesRef.current = (f) => void addFiles(f);

  const canSend = !busy && loading === 0 && (text.trim().length > 0 || atts.length > 0);
  const send = () => {
    if (!canSend) return;
    onSend(text.trim(), atts);
    setText('');
    setAtts([]);
    if (isMobile()) ta.current?.blur();
  };

  const enterSends = settings.enterToSend === 'enter' || (settings.enterToSend === 'auto' && !isMobile());

  const onPaste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  return (
    <div className="composer-wrap" ref={wrapRef}>
      <div className="composer glass">
        {(atts.length > 0 || loading > 0) && (
          <div className="composer-atts scroll-x">
            {atts.map((a) => (
              <AttachmentChip key={a.id} a={a} onRemove={() => setAtts(atts.filter((x) => x.id !== a.id))} />
            ))}
            {loading > 0 && (
              <div className="att att-loading">
                <Spinner />
              </div>
            )}
          </div>
        )}
        <textarea
          ref={ta}
          className="composer-input"
          rows={1}
          value={text}
          placeholder={project ? t('composer.placeholderProject', { name: project.name }) : t('composer.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            const mod = e.metaKey || e.ctrlKey;
            if ((enterSends && !e.shiftKey && !mod) || (!enterSends && mod)) {
              e.preventDefault();
              send();
            }
          }}
          enterKeyHint={enterSends ? 'send' : 'enter'}
        />
        <div className="composer-bar">
          <IconButton label={t('composer.attach')} onClick={(e) => attachMenu.show(e.currentTarget)}>
            <Plus size={25} />
          </IconButton>
          <IconButton label={t('composer.options')} onClick={() => setOptsOpen(true)} active={thinking || !!opts.webSearch || connectorsOn > 0}>
            <SlidersHorizontal size={22} />
          </IconButton>
          <span className="composer-flags">
            {thinking && (
              <button className="flag" onClick={() => onOpts({ thinking: false })} title={t('opts.thinking')}>
                <Brain size={14} />
                {effort !== 'default' && <span>{t(`effort.${effort}` as never)}</span>}
              </button>
            )}
            {opts.webSearch && provider?.kind === 'anthropic' && (
              <button className="flag" onClick={() => onOpts({ webSearch: false })} title={t('opts.webSearch')}>
                <Globe size={14} />
              </button>
            )}
          </span>
          <button className="model-chip" onClick={() => setModelOpen(true)}>
            <span className="model-chip-name">{model || t('model.choose')}</span>
            <ChevronDown size={14} />
          </button>
          {busy ? (
            <button className="send-btn stop" aria-label={t('composer.stop')} onClick={onStop}>
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button className={cx('send-btn', canSend && 'ready')} aria-label={t('composer.send')} disabled={!canSend} onClick={send}>
              <ArrowUp size={20} />
            </button>
          )}
        </div>
      </div>
      <Menu
        anchor={attachMenu.anchor}
        open={attachMenu.open}
        onClose={attachMenu.close}
        placement="above"
        items={[
          { label: t('composer.photos'), icon: <ImageIcon size={17} />, onClick: () => void pickFiles('image/*').then(addFiles) },
          ...(isMobile() ? [{ label: t('composer.camera'), icon: <Camera size={17} />, onClick: () => void pickFiles('image/*', 'environment').then(addFiles) }] : []),
          { label: t('composer.files'), icon: <FileUp size={17} />, onClick: () => void pickFiles('*/*').then(addFiles) },
        ]}
      />
      <ModelPicker
        open={modelOpen}
        onClose={() => setModelOpen(false)}
        providerId={provider?.id}
        model={model}
        onPick={(providerId, m) => onOpts({ providerId, model: m })}
      />
      <ChatOptions open={optsOpen} onClose={() => setOptsOpen(false)} opts={opts} onOpts={onOpts} provider={provider} project={project} />
    </div>
  );
}
