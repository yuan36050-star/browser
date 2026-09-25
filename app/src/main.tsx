import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { logger } from './lib/logger';
import { captureOAuthRedirect } from './lib/mcp/oauth';
import { initStore } from './lib/store';
import './styles/base.css';
import './styles/app.css';

async function boot() {
  // OAuth popups hand the code back to the opener and never render the app.
  if (captureOAuthRedirect()) return;

  const root = createRoot(document.getElementById('root')!);
  try {
    await initStore();
  } catch (e) {
    document.getElementById('root')!.innerHTML = `<p style="padding:24px;font:15px system-ui">Could not open local storage (IndexedDB): ${String(e)}. Private browsing modes can block it.</p>`;
    return;
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  logger.debug('app', 'Started', { version: __APP_VERSION__, ua: navigator.userAgent });

  window.addEventListener('unhandledrejection', (e) => logger.error('app', `Unhandled: ${String(e.reason?.message ?? e.reason)}`));
  window.addEventListener('error', (e) => logger.error('app', `Error: ${e.message}`, { file: e.filename, line: e.lineno }));

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

void boot();
