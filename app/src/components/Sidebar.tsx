import { Box, FolderOpen, Pin, Plug, ScrollText, Search, Settings, SquarePen, Trash2, X, Pencil, PinOff } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { navigate, useRoute } from '../lib/router';
import { deleteConv, setDrawer, updateConv, useApp } from '../lib/store';
import type { ConversationMeta } from '../lib/types';
import { Logo } from './Logo';
import { cx, IconButton, Menu, useMenu } from './ui';

type GroupKey = 'side.pinned' | 'side.today' | 'side.yesterday' | 'side.week' | 'side.month' | 'side.older';

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

const ORDER: GroupKey[] = ['side.pinned', 'side.today', 'side.yesterday', 'side.week', 'side.month', 'side.older'];

export function Sidebar() {
  const t = useT();
  const open = useApp((s) => s.drawerOpen);
  const convs = useApp((s) => s.convs);
  const projects = useApp((s) => s.projects);
  const running = useApp((s) => s.running);
  const userName = useApp((s) => s.settings.userName);
  const route = useRoute();
  const [q, setQ] = useState('');
  const menu = useMenu();
  const [target, setTarget] = useState<ConversationMeta | null>(null);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  const activeId = route.parts[0] === 'c' ? route.parts[1] : undefined;
  const go = (path: string) => {
    navigate(path);
    setDrawer(false);
  };

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = ql ? convs.filter((c) => (c.title + ' ' + (c.preview ?? '')).toLowerCase().includes(ql)) : convs;
    const map = new Map<GroupKey, ConversationMeta[]>();
    for (const c of list) {
      const g = groupOf(c);
      map.set(g, [...(map.get(g) ?? []), c]);
    }
    return ORDER.filter((g) => map.has(g)).map((g) => ({ key: g, items: map.get(g)! }));
  }, [convs, q]);

  const openMenu = (el: HTMLElement, c: ConversationMeta) => {
    setTarget(c);
    menu.show(el);
  };

  return (
    <>
      <div className={cx('drawer-scrim', open && 'open')} onClick={() => setDrawer(false)} />
      <aside className={cx('sidebar', open && 'open')} aria-label={t('nav.menu')}>
        <div className="sidebar-head">
          <button className="brand" onClick={() => go('/')}>
            <Logo size={26} />
            <span>Cove</span>
          </button>
          <IconButton label={t('common.close')} className="menu-only" onClick={() => setDrawer(false)}>
            <X size={20} />
          </IconButton>
        </div>

        <button className="new-chat" onClick={() => go('/')}>
          <SquarePen size={18} />
          <span>{t('chat.new')}</span>
        </button>

        <nav className="nav">
          <button className={cx(route.parts[0] === 'projects' && 'on')} onClick={() => go('/projects')}>
            <FolderOpen size={18} />
            <span>{t('nav.projects')}</span>
          </button>
          <button className={cx(route.parts[0] === 'pods' && 'on')} onClick={() => go('/pods')}>
            <Box size={18} />
            <span>{t('nav.pods')}</span>
          </button>
          <button className={cx(route.parts[0] === 'connectors' && 'on')} onClick={() => go('/connectors')}>
            <Plug size={18} />
            <span>{t('nav.connectors')}</span>
          </button>
          <button className={cx(route.parts[0] === 'logs' && 'on')} onClick={() => go('/logs')}>
            <ScrollText size={18} />
            <span>{t('nav.logs')}</span>
          </button>
        </nav>

        <div className="search-box side-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('side.search')} autoCapitalize="off" autoCorrect="off" />
        </div>

        <div className="recents scroll">
          {groups.length === 0 && <p className="recents-empty">{q ? t('side.noMatch') : t('side.empty')}</p>}
          {groups.map((g) => (
            <div key={g.key} className="recent-group">
              <h4>{t(g.key)}</h4>
              {g.items.map((c) => {
                const proj = c.projectId ? projects.find((p) => p.id === c.projectId) : undefined;
                return (
                  <button
                    key={c.id}
                    className={cx('recent', c.id === activeId && 'on')}
                    onClick={() => {
                      if (longPressed.current) {
                        longPressed.current = false;
                        return;
                      }
                      go(`/c/${c.id}`);
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
                      }, 520);
                    }}
                    onTouchEnd={() => clearTimeout(press.current)}
                    onTouchMove={() => clearTimeout(press.current)}
                  >
                    {proj && <span className="recent-emoji">{proj.emoji}</span>}
                    <span className="recent-title">{c.title || c.preview || t('chat.untitled')}</span>
                    {running[c.id] && <span className="recent-live" />}
                    {c.pinned && !running[c.id] && <Pin size={12} className="recent-pin" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-foot">
          <button className="me" onClick={() => go('/settings')}>
            <span className="avatar">{(userName || 'U').slice(0, 1).toUpperCase()}</span>
            <span className="me-name">{userName || t('side.you')}</span>
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {target && (
        <Menu
          anchor={menu.anchor}
          open={menu.open}
          onClose={menu.close}
          items={[
            {
              label: t('common.rename'),
              icon: <Pencil size={16} />,
              onClick: async () => {
                const v = await promptDialog({ title: t('common.rename'), field: { value: target.title } });
                if (v !== null) updateConv(target.id, { title: v.trim() });
              },
            },
            {
              label: target.pinned ? t('chat.unpin') : t('chat.pin'),
              icon: target.pinned ? <PinOff size={16} /> : <Pin size={16} />,
              onClick: () => updateConv(target.id, { pinned: !target.pinned }),
            },
            'sep',
            {
              label: t('common.delete'),
              icon: <Trash2 size={16} />,
              danger: true,
              onClick: async () => {
                if (await confirmDialog({ title: t('chat.deleteConfirm'), danger: true, confirmLabel: t('common.delete') })) {
                  await deleteConv(target.id);
                  if (activeId === target.id) navigate('/', true);
                }
              },
            },
          ]}
        />
      )}
    </>
  );
}
