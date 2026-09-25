import { History, MessageCircle, Settings } from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import { useT } from '../i18n';
import { navigate, useRoute } from '../lib/router';
import { cx } from './ui';

export type TabId = 'chats' | 'history' | 'settings';

const ROOTS: Record<TabId, string> = { chats: '/', history: '/history', settings: '/settings' };
/** Each tab remembers where you left it, like a UITabBarController stack. */
const lastPath: Record<TabId, string> = { ...ROOTS };

export function tabFor(parts: string[]): TabId {
  const a = parts[0];
  if (a === undefined || a === 'c') return 'chats';
  if (a === 'history' || a === 'projects') return 'history';
  return 'settings';
}

export function TabBar() {
  const t = useT();
  const route = useRoute();
  const current = tabFor(route.parts);
  const qs = route.query.toString();
  const raw = route.path + (qs ? `?${qs}` : '');

  useEffect(() => {
    lastPath[current] = raw;
  }, [current, raw]);

  const tabs: { id: TabId; label: string; icon: typeof History }[] = [
    { id: 'chats', label: t('tab.chats'), icon: MessageCircle },
    { id: 'history', label: t('tab.history'), icon: History },
    { id: 'settings', label: t('tab.settings'), icon: Settings },
  ];
  const index = tabs.findIndex((x) => x.id === current);

  const press = (id: TabId) => {
    if (id !== current) navigate(lastPath[id] ?? ROOTS[id]);
    else if (id !== 'chats' && raw !== ROOTS[id]) navigate(ROOTS[id]);
    else window.dispatchEvent(new Event('cove:scroll-top'));
  };

  return (
    <nav className="tabbar glass" style={{ '--i': index, '--n': tabs.length } as CSSProperties} aria-label={t('nav.menu')}>
      <span className="tab-lens" aria-hidden />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cx('tab', tab.id === current && 'on')}
          aria-current={tab.id === current ? 'page' : undefined}
          onClick={() => press(tab.id)}
        >
          <tab.icon size={25} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
