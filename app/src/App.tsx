import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar';
import { Button, cx, Sheet, TextArea, TextInput } from './components/ui';
import { currentLang, useT } from './i18n';
import { closeDialog, useDialog } from './lib/dialog';
import { applyGlass } from './lib/glass';
import { finishOAuth } from './lib/mcp/client';
import { navigate, useRoute } from './lib/router';
import { toast, useApp } from './lib/store';
import { errorMessage } from './lib/util';
import { ChatScreen } from './screens/ChatScreen';
import { ConnectorEditor, ConnectorsList } from './screens/ConnectorsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { LogsScreen } from './screens/LogsScreen';
import { PodDetail, PodsList } from './screens/PodsScreen';
import { ProjectDetail, ProjectsList } from './screens/ProjectsScreen';
import { ProviderEditor, ProvidersList } from './screens/ProvidersScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function useThemeAttributes() {
  const { theme, fontSize, assistantFont, language, glassAlpha } = useApp((s) => s.settings);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#151412' : '#f7f5f0'));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.fs = fontSize;
    document.documentElement.dataset.afont = assistantFont;
    document.documentElement.lang = currentLang(language) === 'zh' ? 'zh-CN' : 'en';
  }, [fontSize, assistantFont, language]);
  // Liquid Glass intensity: every glass layer reads these variables.
  useEffect(() => applyGlass(glassAlpha), [glassAlpha]);
}

function useOAuthCompletion() {
  const t = useT();
  useEffect(() => {
    const done = new Set<string>();
    const handle = async (data: unknown) => {
      const d = data as { type?: string; code?: string; state?: string };
      if (d?.type !== 'cove-oauth' || !d.code || !d.state || done.has(d.state)) return;
      done.add(d.state);
      try {
        const name = await finishOAuth(d.state, d.code);
        if (name) toast(t('connectors.signedIn', { name }), 'success');
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin) void handle(e.data);
    };
    window.addEventListener('message', onMessage);
    let bc: BroadcastChannel | undefined;
    try {
      bc = new BroadcastChannel('cove-oauth');
      bc.onmessage = (e) => void handle(e.data);
    } catch {
      /* unsupported */
    }
    const stashed = sessionStorage.getItem('cove.oauth.result');
    if (stashed) {
      sessionStorage.removeItem('cove.oauth.result');
      navigate('/connectors', true);
      void handle(JSON.parse(stashed));
    }
    return () => {
      window.removeEventListener('message', onMessage);
      bc?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/** iOS-style banners: a glass capsule that springs down from the top. */
function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const last = toasts[toasts.length - 1];
  if (!last) return null;
  const Icon = last.kind === 'error' ? CircleAlert : last.kind === 'success' ? CircleCheck : Info;
  return (
    <div className="toasts" aria-live="polite">
      <div key={last.id} className={cx('toast glass strong', `toast-${last.kind}`)}>
        <Icon size={20} />
        <span>{last.text}</span>
      </div>
    </div>
  );
}

/** Confirm / prompt dialogs are iOS action sheets, never centered alerts. */
function DialogHost() {
  const t = useT();
  const d = useDialog();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (d.open) setValue(d.field?.value ?? '');
  }, [d.open, d.field]);
  const confirm = () => closeDialog(d.field ? value : true);
  const cancel = () => closeDialog(d.field ? null : false);
  return (
    <Sheet
      open={d.open}
      onClose={cancel}
      title={d.title}
      size="sm"
      variant="action"
      footer={
        <>
          <Button size="lg" variant={d.danger ? 'danger' : 'primary'} onClick={confirm}>
            {d.confirmLabel ?? t('common.ok')}
          </Button>
          <Button size="lg" variant="secondary" onClick={cancel}>
            {t('common.cancel')}
          </Button>
        </>
      }
    >
      {d.message && <p className="dialog-text">{d.message}</p>}
      {d.field &&
        (d.field.multiline ? (
          <TextArea autoGrow autoFocus value={value} placeholder={d.field.placeholder} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <TextInput
            autoFocus
            value={value}
            placeholder={d.field.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        ))}
    </Sheet>
  );
}

function Routes() {
  const { parts, query } = useRoute();
  const [a, b] = parts;
  switch (a) {
    case undefined:
      return <ChatScreen projectId={query.get('project') ?? undefined} />;
    case 'c':
      return <ChatScreen key={b} convId={b} />;
    case 'history':
      return <HistoryScreen />;
    case 'projects':
      return b ? <ProjectDetail key={b} id={b} /> : <ProjectsList />;
    case 'pods':
      return b ? <PodDetail key={b} id={b} /> : <PodsList />;
    case 'connectors':
      return b ? <ConnectorEditor key={b + (query.get('preset') ?? '')} id={b} preset={query.get('preset') ?? undefined} /> : <ConnectorsList />;
    case 'providers':
      return b ? <ProviderEditor key={b + (query.get('preset') ?? '')} id={b} preset={query.get('preset') ?? undefined} /> : <ProvidersList />;
    case 'logs':
      return <LogsScreen />;
    case 'settings':
      return <SettingsScreen section={b} />;
    default:
      return <ChatScreen />;
  }
}

/**
 * Keeps the layout above the on-screen keyboard (iOS does not resize the layout viewport)
 * and flags the keyboard so the tab bar can slide away like it does on iOS.
 */
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let base = Math.max(window.innerHeight, vv.height);
    const update = () => {
      base = Math.max(base, window.innerHeight);
      document.documentElement.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
      document.documentElement.dataset.kb = typing && vv.height < base * 0.8 ? 'open' : '';
      if (vv.offsetTop > 0 && document.activeElement?.tagName === 'TEXTAREA') window.scrollTo(0, 0);
    };
    const reset = () => {
      base = Math.max(window.innerHeight, vv.height);
      update();
    };
    const onBlur = () => setTimeout(update, 60);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', reset);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onBlur);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', reset);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);
}

export function App() {
  useThemeAttributes();
  useOAuthCompletion();
  useVisualViewport();
  return (
    <div className="app">
      <main className="main">
        <Routes />
      </main>
      <TabBar />
      <Toasts />
      <DialogHost />
    </div>
  );
}
