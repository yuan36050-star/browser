import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function snapshot() {
  return location.hash.replace(/^#/, '') || '/';
}

export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

export function parseRoute(raw: string): Route {
  const [path, qs] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs ?? '') };
}

export function useRoute(): Route {
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);
  return parseRoute(raw);
}

// In-app history depth, so "back" never leaves the app when it was opened on a deep link.
let depth = 0;
window.addEventListener('popstate', () => {
  depth = Math.max(0, depth - 1);
});

export function navigate(path: string, replace = false) {
  const target = `#${path}`;
  if (snapshot() === path) return;
  if (replace) history.replaceState(null, '', target);
  else {
    history.pushState(null, '', target);
    depth++;
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function goBack(fallback = '/') {
  if (depth > 0) history.back();
  else navigate(fallback, true);
}
