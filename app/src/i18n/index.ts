import { useApp, getState } from '../lib/store';
import { en } from './en';
import { zh } from './zh';

export type TKey = keyof typeof en;
export type Lang = 'en' | 'zh';

const dicts: Record<Lang, Record<TKey, string>> = { en, zh };

export function currentLang(pref = getState().settings.language): Lang {
  if (pref === 'en' || pref === 'zh') return pref;
  return /^zh/i.test(navigator.language) ? 'zh' : 'en';
}

function format(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  return format(dicts[currentLang()][key] ?? en[key] ?? key, vars);
}

export function useT() {
  const pref = useApp((s) => s.settings.language);
  const lang = currentLang(pref);
  return (key: TKey, vars?: Record<string, string | number>) => format(dicts[lang][key] ?? en[key] ?? key, vars);
}
