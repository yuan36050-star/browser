import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Button, TextArea, TextInput, Sheet } from './components/ui';
import { currentLang, useT } from './i18n';
import { closeDialog, useDialog } from './lib/dialog';
import { finishOAuth } from './lib/mcp/client';
import { navigate, useRoute } from './lib/router';
import { toast, useApp } from './lib/store';
import { errorMessage } from './lib/util';
import { ChatScreen } from './screens/ChatScreen';
import { ConnectorEditor, ConnectorsList } from './screens/ConnectorsScreen';
import { LogsScreen } from './screens/LogsScreen';
import { PodDetail, PodsList } from './screens/PodsScreen';
import { ProjectDetail, ProjectsList } from './screens/ProjectsScreen';
import { ProviderEditor, ProvidersList } from './screens/ProvidersScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function useThemeAttributes() {
  const { theme, fontSize, assistantFont, language } = useApp((s) => s.settings);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#1c1b19' : '#f7f5f0'));
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

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function DialogHost() {
  const t = useT();
  const d = useDialog();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (d.open) setValue(d.field?.value ?? '');
  }, [d.open, d.field]);
  const confirm = () => closeDialog(d.field ? value : true);
  return (
    <Sheet
      open={d.open}
      onClose={() => closeDialog(d.field ? null : false)}
      title={d.title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => closeDialog(d.field ? null : false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={d.danger ? 'danger' : 'primary'} onClick={confirm}>
            {d.confirmLabel ?? t('common.ok')}
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

/** Keeps the layout above the on-screen keyboard (iOS does not resize the layout viewport). */
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
      if (vv.offsetTop > 0 && document.activeElement?.tagName === 'TEXTAREA') window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}

export function App() {
  useThemeAttributes();
  useOAuthCompletion();
  useVisualViewport();
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes />
      </main>
      <Toasts />
      <DialogHost />
    </div>
  );
}
