import { FolderOpen, MessageCircle, Pencil, Pin, PinOff, Search, SquarePen, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Empty, IconButton, Menu, Page, Row, Section, useMenu } from '../components/ui';
import { useT } from '../i18n';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { navigate } from '../lib/router';
import { deleteConv, updateConv, useApp } from '../lib/store';
import type { ConversationMeta } from '../lib/types';

type GroupKey = 'side.pinned' | 'side.today' | 'side.yesterday' | 'side.week' | 'side.month' | 'side.older';
const ORDER: GroupKey[] = ['side.pinned', 'side.today', 'side.yesterday', 'side.week', 'side.month', 'side.older'];

function groupOf(c: ConversationMeta): GroupKey {
  if (c.pinned) return 'side.pinned';
  const d = new Date(c.updatedAt);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = 86400000;
  if (d >= start) return 'side.today';
  if (d.getTime() >= start.getTime() - day) return 'side.yesterday';
  if (d.getTime() >= start.getTime() - 7 * day) return 'side.week';
  if (d.getTime() >= start.getTime() - 30 * day) return 'side.month';
  return 'side.older';
}

function when(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - ts < 6 * 86400000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
}

export function HistoryScreen() {
  const t = useT();
  const convs = useApp((s) => s.convs);
  const projects = useApp((s) => s.projects);
  const running = useApp((s) => s.running);
  const [q, setQ] = useState('');
  const menu = useMenu();
  const [target, setTarget] = useState<ConversationMeta | null>(null);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = ql ? convs.filter((c) => (c.title + ' ' + (c.preview ?? '')).toLowerCase().includes(ql)) : convs;
    const map = new Map<GroupKey, ConversationMeta[]>();
    for (const c of list) map.set(groupOf(c), [...(map.get(groupOf(c)) ?? []), c]);
    return ORDER.filter((g) => map.has(g)).map((g) => ({ key: g, items: map.get(g)! }));
  }, [convs, q]);

  const openMenu = (el: HTMLElement, c: ConversationMeta) => {
    setTarget(c);
    menu.show(el);
  };

  return (
    <Page
      title={t('tab.history')}
      right={
        <IconButton className="nav-btn" label={t('chat.new')} onClick={() => navigate('/')}>
          <SquarePen size={21} />
        </IconButton>
      }
    >
      <label className="search-field">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('side.search')} autoCapitalize="off" autoCorrect="off" enterKeyHint="search" />
      </label>

      <Section>
        <Row icon={<FolderOpen size={21} />} title={t('nav.projects')} detail={projects.length || undefined} onClick={() => navigate('/projects')} chevron />
      </Section>

      {groups.length === 0 && <Empty icon={<MessageCircle size={44} />} title={q ? t('side.noMatch') : t('side.empty')} />}

      {groups.map((g) => (
        <Section key={g.key} title={t(g.key)}>
          {g.items.map((c) => {
            const proj = c.projectId ? projects.find((p) => p.id === c.projectId) : undefined;
            return (
              <button
                key={c.id}
                className="row clickable conv-row"
                onClick={() => {
                  if (longPressed.current) {
                    longPressed.current = false;
                    return;
                  }
                  navigate(`/c/${c.id}`);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu(e.currentTarget, c);
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget;
                  longPressed.current = false;
                  press.current = setTimeout(() => {
                    longPressed.current = true;
                    openMenu(el, c);
                  }, 480);
                }}
                onTouchEnd={() => clearTimeout(press.current)}
                onTouchMove={() => clearTimeout(press.current)}
              >
                <span className="row-main">
                  <span className="conv-top">
                    <span className="conv-title">
                      {proj && <span className="conv-emoji">{proj.emoji}</span>}
                      {c.title || c.preview || t('chat.untitled')}
                    </span>
                    <span className="conv-time">
                      {running[c.id] && <span className="live-dot" aria-hidden />}
                      {c.pinned && <Pin size={13} />}
                      {when(c.updatedAt)}
                    </span>
                  </span>
                  {c.preview && c.title && <span className="row-sub conv-preview">{c.preview}</span>}
                </span>
              </button>
            );
          })}
        </Section>
      ))}

      {target && (
        <Menu
          anchor={menu.anchor}
          open={menu.open}
          onClose={menu.close}
          items={[
            {
              label: t('common.rename'),
              icon: <Pencil size={18} />,
              onClick: async () => {
                const v = await promptDialog({ title: t('common.rename'), field: { value: target.title } });
                if (v !== null) updateConv(target.id, { title: v.trim() });
              },
            },
            {
              label: target.pinned ? t('chat.unpin') : t('chat.pin'),
              icon: target.pinned ? <PinOff size={18} /> : <Pin size={18} />,
              onClick: () => updateConv(target.id, { pinned: !target.pinned }),
            },
            'sep',
            {
              label: t('common.delete'),
              icon: <Trash2 size={18} />,
              danger: true,
              onClick: async () => {
                if (await confirmDialog({ title: t('chat.deleteConfirm'), danger: true, confirmLabel: t('common.delete') })) {
                  await deleteConv(target.id);
                }
              },
            },
          ]}
        />
      )}
    </Page>
  );
}
