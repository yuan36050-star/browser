import { ArrowDown, Check, Download, Ellipsis, FolderInput, Pencil, Pin, PinOff, SquarePen, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Composer, type ChatOpts } from '../components/Composer';
import { Logo } from '../components/Logo';
import { AssistantMessage, UserMessage } from '../components/Message';
import { Button, cx, Empty, IconButton, Menu, NavBar, Row, Section, Sheet, useLargeTitle, useMenu } from '../components/ui';
import { useT } from '../i18n';
import { resolveModel, resolveProvider, sendMessage, stop } from '../lib/agent';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { navigate } from '../lib/router';
import { createConversation, deleteConv, loadMessages, updateConv, useApp } from '../lib/store';
import type { Attachment, ChatMessage } from '../lib/types';
import { downloadFile } from '../lib/util';

function greetingKey(): 'greet.morning' | 'greet.afternoon' | 'greet.evening' | 'greet.night' {
  const h = new Date().getHours();
  if (h < 5) return 'greet.night';
  if (h < 12) return 'greet.morning';
  if (h < 18) return 'greet.afternoon';
  if (h < 23) return 'greet.evening';
  return 'greet.night';
}

function toMarkdown(title: string, msgs: ChatMessage[]): string {
  const out = [`# ${title || 'Chat'}`, ''];
  for (const m of msgs) {
    if (m.role === 'user') {
      out.push('## User', '');
      for (const a of m.attachments ?? []) out.push(`*[attachment: ${a.name}]*`);
      out.push(m.text ?? '', '');
    } else {
      out.push(`## Assistant${m.model ? ` (${m.model})` : ''}`, '');
      for (const b of m.blocks ?? []) {
        if (b.type === 'text') out.push(b.text, '');
        else if (b.type === 'tool_use') out.push(`> 🔧 ${b.label ?? b.name} \`${JSON.stringify(b.input).slice(0, 300)}\``, '');
      }
    }
  }
  return out.join('\n');
}

export function ChatScreen({ convId, projectId }: { convId?: string; projectId?: string }) {
  const t = useT();
  const conv = useApp((s) => (convId ? s.convs.find((c) => c.id === convId) : undefined));
  const messages = useApp((s) => (convId ? s.messages[convId] : undefined));
  const busy = useApp((s) => (convId ? !!s.running[convId] : false));
  const providers = useApp((s) => s.providers);
  const projects = useApp((s) => s.projects);
  const userName = useApp((s) => s.settings.userName);
  const [draft, setDraft] = useState<ChatOpts>({ projectId });
  const [loaded, setLoaded] = useState(!convId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [dragging, setDragging] = useState(false);
  const addFilesRef = useRef<((files: File[]) => void) | null>(null);
  const menu = useMenu();
  const [moveOpen, setMoveOpen] = useState(false);
  const large = useLargeTitle();

  useEffect(() => {
    setDraft({ projectId });
  }, [projectId]);

  useEffect(() => {
    if (!convId) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    stick.current = true;
    void loadMessages(convId).then(() => setLoaded(true));
  }, [convId]);

  const opts: ChatOpts = conv
    ? { providerId: conv.providerId, model: conv.model, thinking: conv.thinking, effort: conv.effort, webSearch: conv.webSearch, projectId: conv.projectId }
    : draft;
  const project = projects.find((p) => p.id === opts.projectId);

  const onOpts = (patch: Partial<ChatOpts>) => {
    if (conv) updateConv(conv.id, patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };

  // Stick to the bottom while streaming unless the user scrolled up.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    large.onScroll(el);
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stick.current = near;
    setAtBottom(near);
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current && messages?.length) el.scrollTop = el.scrollHeight;
    if (el) large.onScroll(el);
  }, [messages, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const onSend = useCallback(
    (text: string, atts: Attachment[]) => {
      stick.current = true;
      if (conv) {
        void sendMessage(conv.id, text, atts);
        return;
      }
      const provider = resolveProvider(draft);
      const c = createConversation({
        ...draft,
        providerId: draft.providerId ?? provider?.id,
        model: draft.model ?? (resolveModel(provider, draft) || undefined),
      });
      navigate(`/c/${c.id}`, true);
      void sendMessage(c.id, text, atts);
    },
    [conv, draft],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) addFilesRef.current?.(files);
  };

  const title = conv ? conv.title || t('chat.untitled') : project ? project.name : t('chat.new');
  const titleNode = (
    <>
      {project && <span className="title-emoji">{project.emoji}</span>}
      {title}
    </>
  );
  const msgs = messages ?? [];
  const lastId = msgs[msgs.length - 1]?.id;

  return (
    <div
      className="chat"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <NavBar
        title={titleNode}
        scrolled={large.state.scrolled}
        collapsed={large.state.collapsed}
        onTitleClick={conv ? (el) => menu.show(el) : undefined}
        right={
          conv && (
            <>
              <IconButton className="nav-btn" label={t('chat.new')} onClick={() => navigate(project ? `/?project=${project.id}` : '/')}>
                <SquarePen size={21} />
              </IconButton>
              <IconButton className="nav-btn" label={t('common.manage')} onClick={(e) => menu.show(e.currentTarget)}>
                <Ellipsis size={22} />
              </IconButton>
            </>
          )
        }
      />

      <div className="chat-scroll scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="chat-inner">
          <h1 ref={large.titleRef} className="large-title">
            {titleNode}
          </h1>
          {convId && !conv ? (
            <Empty title={t('chat.notFound')} action={<Button variant="primary" onClick={() => navigate('/')}>{t('chat.new')}</Button>} />
          ) : msgs.length === 0 ? (
            <div className="welcome">
              <Logo size={52} />
              <p className="greeting">{userName ? t('greet.named', { greeting: t(greetingKey()), name: userName }) : t(greetingKey())}</p>
              {project && (
                <Section>
                  <Row
                    icon={<span className="row-emoji">{project.emoji}</span>}
                    title={project.name}
                    subtitle={project.description || undefined}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    chevron
                  />
                </Section>
              )}
              {providers.length === 0 ? (
                <>
                  <p className="welcome-note">{t('onboard.text')}</p>
                  <Section>
                    <Row title="Anthropic" subtitle={t('onboard.anthropic')} onClick={() => navigate('/providers/new?preset=anthropic')} chevron />
                    <Row title="cc-bridge" subtitle={t('onboard.bridge')} onClick={() => navigate('/providers/new?preset=cc-bridge')} chevron />
                    <Row title={t('onboard.openai')} subtitle={t('onboard.openaiText')} onClick={() => navigate('/providers/new?preset=custom-openai')} chevron />
                  </Section>
                </>
              ) : (
                <Section>
                  {(['suggest.1', 'suggest.2', 'suggest.3'] as const).map((k) => (
                    <Row key={k} className="suggestion" title={t(k)} onClick={() => onSend(t(k), [])} />
                  ))}
                </Section>
              )}
            </div>
          ) : (
            <div className="messages">
              {msgs.map((m) =>
                m.role === 'user' ? (
                  <UserMessage key={m.id} m={m} convId={convId!} busy={busy} />
                ) : (
                  <AssistantMessage key={m.id} m={m} convId={convId!} isLast={m.id === lastId} busy={busy} />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {!atBottom && msgs.length > 0 && (
        <button className="to-bottom" onClick={scrollToBottom} aria-label={t('chat.toBottom')}>
          <ArrowDown size={19} />
        </button>
      )}

      <Composer
        draftKey={convId ?? `new-${projectId ?? ''}`}
        opts={opts}
        onOpts={onOpts}
        onSend={onSend}
        busy={busy}
        onStop={() => convId && stop(convId)}
        addFilesRef={addFilesRef}
      />

      {dragging && (
        <div className="drop-overlay">
          <Upload size={30} />
          <span>{t('chat.drop')}</span>
        </div>
      )}

      {conv && (
        <Menu
          anchor={menu.anchor}
          open={menu.open}
          onClose={menu.close}
          align="right"
          items={[
            {
              label: t('common.rename'),
              icon: <Pencil size={18} />,
              onClick: async () => {
                const v = await promptDialog({ title: t('common.rename'), field: { value: conv.title } });
                if (v !== null) updateConv(conv.id, { title: v.trim() });
              },
            },
            {
              label: conv.pinned ? t('chat.unpin') : t('chat.pin'),
              icon: conv.pinned ? <PinOff size={18} /> : <Pin size={18} />,
              onClick: () => updateConv(conv.id, { pinned: !conv.pinned }),
            },
            {
              label: t('chat.moveToProject'),
              icon: <FolderInput size={18} />,
              onClick: () => setMoveOpen(true),
            },
            {
              label: t('chat.export'),
              icon: <Download size={18} />,
              onClick: () => downloadFile(`${(conv.title || 'chat').replace(/[^\w一-龥-]+/g, '_')}.md`, toMarkdown(conv.title, msgs), 'text/markdown'),
            },
            'sep',
            {
              label: t('common.delete'),
              icon: <Trash2 size={18} />,
              danger: true,
              onClick: async () => {
                if (await confirmDialog({ title: t('chat.deleteConfirm'), danger: true, confirmLabel: t('common.delete') })) {
                  await deleteConv(conv.id);
                  navigate('/', true);
                }
              },
            },
          ]}
        />
      )}
      {conv && (
        <Sheet open={moveOpen} onClose={() => setMoveOpen(false)} title={t('chat.moveToProject')} size="sm">
          <div className="pick-list">
            <button className={cx('pick-row', !conv.projectId && 'on')} onClick={() => { updateConv(conv.id, { projectId: undefined }); setMoveOpen(false); }}>
              <span className="pick-main"><span className="pick-title">{t('opts.noProject')}</span></span>
              {!conv.projectId && <Check size={20} />}
            </button>
            {projects.map((p) => (
              <button key={p.id} className={cx('pick-row', conv.projectId === p.id && 'on')} onClick={() => { updateConv(conv.id, { projectId: p.id }); setMoveOpen(false); }}>
                <span className="pick-main"><span className="pick-title">{p.emoji} {p.name}</span></span>
                {conv.projectId === p.id && <Check size={20} />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      <div className="sr-only" aria-live="polite">
        {busy ? t('msg.working') : ''}
      </div>
    </div>
  );
}
