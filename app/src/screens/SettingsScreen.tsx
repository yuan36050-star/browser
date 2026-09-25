import {
  Box,
  Brain,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  KeyRound,
  Languages,
  Moon,
  Palette,
  Plug,
  ScrollText,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wrench,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ModelPicker } from '../components/ModelPicker';
import { Badge, Button, Field, IconButton, Row, Screen, ScreenBar, Section, Segmented, Select, Sheet, Switch, TextArea, TextInput } from '../components/ui';
import { useT } from '../i18n';
import { exportAll, importAll, wipeAll } from '../lib/backup';
import { confirmDialog } from '../lib/dialog';
import { pickFiles } from '../lib/files';
import { navigate } from '../lib/router';
import { toast, updateSettings, useApp } from '../lib/store';
import { allBuiltinNames } from '../lib/tools/builtin';
import type { Effort, PermissionMode, Settings } from '../lib/types';
import { errorMessage, formatBytes } from '../lib/util';

const REPO_URL = 'https://github.com/yuan36050-star/browser';
const EFFORTS: Effort[] = ['default', 'low', 'medium', 'high', 'xhigh', 'max'];

function Debounced({ value, onCommit, multiline, placeholder, rows }: { value: string; onCommit: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const h = setTimeout(() => onCommit(v), 400);
    return () => clearTimeout(h);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return multiline ? (
    <TextArea autoGrow rows={rows ?? 4} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />
  ) : (
    <TextInput value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />
  );
}

export function SettingsScreen({ section }: { section?: string }) {
  const t = useT();
  const s = useApp((st) => st.settings);
  const providers = useApp((st) => st.providers);
  const connectors = useApp((st) => st.connectors);
  const projects = useApp((st) => st.projects);
  const pods = useApp((st) => st.pods);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [withKeys, setWithKeys] = useState(false);
  const [withLogs, setWithLogs] = useState(false);
  const [storage, setStorage] = useState<string>('');
  const set = (patch: Partial<Settings>) => updateSettings(patch);
  const defaultProvider = providers.find((p) => p.id === s.defaultProviderId);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setStorage(`${formatBytes(e.usage ?? 0)} / ${formatBytes(e.quota ?? 0)}`));
  }, []);
  useLayoutEffect(() => {
    if (section) document.getElementById(`settings-${section}`)?.scrollIntoView();
  }, [section]);

  const tools = allBuiltinNames();
  const groups: { key: keyof Settings['tools']; label: string; hint: string }[] = [
    { key: 'pods', label: t('tools.pods'), hint: t('tools.podsHint') },
    { key: 'manage', label: t('tools.manage'), hint: t('tools.manageHint') },
    { key: 'history', label: t('tools.history'), hint: t('tools.historyHint') },
    { key: 'logs', label: t('tools.logs'), hint: t('tools.logsHint') },
    { key: 'javascript', label: t('tools.javascript'), hint: t('tools.javascriptHint') },
    { key: 'fetch', label: t('tools.fetch'), hint: t('tools.fetchHint') },
  ];

  return (
    <>
      <ScreenBar title={t('nav.settings')} />
      <Screen narrow>
        <Section>
          <Row icon={<Server size={18} />} title={t('nav.providers')} detail={providers.length || undefined} onClick={() => navigate('/providers')} chevron />
          <Row icon={<Plug size={18} />} title={t('nav.connectors')} detail={connectors.length || undefined} onClick={() => navigate('/connectors')} chevron />
          <Row icon={<FolderOpen size={18} />} title={t('nav.projects')} detail={projects.length || undefined} onClick={() => navigate('/projects')} chevron />
          <Row icon={<Box size={18} />} title={t('nav.pods')} detail={pods.length || undefined} onClick={() => navigate('/pods')} chevron />
          <Row icon={<ScrollText size={18} />} title={t('nav.logs')} onClick={() => navigate('/logs')} chevron />
        </Section>

        <Section title={t('settings.profile')}>
          <div className="form">
            <Field label={t('settings.name')}>
              <Debounced value={s.userName} onCommit={(v) => set({ userName: v })} placeholder={t('settings.namePlaceholder')} />
            </Field>
            <Field label={t('settings.instructions')} hint={t('settings.instructionsHint')}>
              <Debounced multiline value={s.systemPrompt} onCommit={(v) => set({ systemPrompt: v })} placeholder={t('settings.instructionsPlaceholder')} />
            </Field>
          </div>
        </Section>

        <Section title={t('settings.models')}>
          <Row
            icon={<Sparkles size={18} />}
            title={t('settings.defaultModel')}
            subtitle={defaultProvider ? `${defaultProvider.name} · ${s.defaultModel ?? defaultProvider.models[0]?.id ?? '—'}` : t('settings.none')}
            onClick={() => setPickerOpen(true)}
            chevron
          />
          <Row icon={<Brain size={18} />} title={t('settings.defaultThinking')} right={<Switch checked={s.defaultThinking} onChange={(v) => set({ defaultThinking: v })} />} />
          <div className="row-block">
            <span className="row-block-label">{t('opts.effort')}</span>
            <div className="scroll-x">
              <Segmented size="sm" value={s.defaultEffort} onChange={(v) => set({ defaultEffort: v })} options={EFFORTS.map((e) => ({ value: e, label: t(`effort.${e}` as never) }))} />
            </div>
          </div>
          <div className="form">
            <div className="form-2">
              <Field label={t('settings.maxTokens')}>
                <TextInput inputMode="numeric" value={String(s.maxTokens)} onChange={(e) => set({ maxTokens: Math.max(256, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
              </Field>
              <Field label={t('settings.maxSteps')}>
                <TextInput inputMode="numeric" value={String(s.maxSteps)} onChange={(e) => set({ maxSteps: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })} />
              </Field>
            </div>
            <Field label={t('settings.temperature')} hint={t('settings.temperatureHint')}>
              <TextInput inputMode="decimal" value={s.temperature} placeholder={t('settings.auto')} onChange={(e) => set({ temperature: e.target.value.replace(/[^\d.]/g, '') })} />
            </Field>
          </div>
          <Row title={t('settings.autoTitle')} subtitle={t('settings.autoTitleHint')} right={<Switch checked={s.autoTitle} onChange={(v) => set({ autoTitle: v })} />} />
        </Section>

        <Section title={t('settings.appearance')}>
          <div className="form">
            <Field label={<><Languages size={15} /> {t('settings.language')}</>}>
              <Segmented value={s.language} onChange={(v) => set({ language: v })} options={[{ value: 'auto', label: t('settings.auto') }, { value: 'en', label: 'English' }, { value: 'zh', label: '中文' }]} />
            </Field>
            <Field label={<><Moon size={15} /> {t('settings.theme')}</>}>
              <Segmented value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: 'system', label: t('settings.system') }, { value: 'light', label: t('settings.light') }, { value: 'dark', label: t('settings.dark') }]} />
            </Field>
            <Field label={<><Type size={15} /> {t('settings.textSize')}</>}>
              <Segmented value={s.fontSize} onChange={(v) => set({ fontSize: v })} options={[{ value: 'sm', label: 'A−' }, { value: 'md', label: 'A' }, { value: 'lg', label: 'A+' }]} />
            </Field>
            <Field label={<><Palette size={15} /> {t('settings.assistantFont')}</>}>
              <Segmented value={s.assistantFont} onChange={(v) => set({ assistantFont: v })} options={[{ value: 'serif', label: t('settings.serif') }, { value: 'sans', label: t('settings.sans') }]} />
            </Field>
            <Field label={t('settings.enterToSend')}>
              <Select
                value={s.enterToSend}
                onChange={(v) => set({ enterToSend: v })}
                options={[
                  { value: 'auto', label: t('settings.enterAuto') },
                  { value: 'enter', label: t('settings.enterEnter') },
                  { value: 'mod-enter', label: t('settings.enterMod') },
                ]}
              />
            </Field>
          </div>
        </Section>

        <div id="settings-ai" />
        <Section title={t('settings.ai')} footer={t('settings.aiFooter')}>
          <div className="row-block">
            <span className="row-block-label">
              <ShieldCheck size={16} /> {t('settings.permissionMode')}
            </span>
            <Segmented<PermissionMode>
              size="sm"
              value={s.permissionMode}
              onChange={(v) => set({ permissionMode: v })}
              options={[
                { value: 'ask', label: t('perm.ask') },
                { value: 'auto-read', label: t('perm.autoRead') },
                { value: 'auto', label: t('perm.auto') },
              ]}
            />
            <span className="row-block-hint">{t(`perm.${s.permissionMode === 'auto-read' ? 'autoRead' : s.permissionMode}Hint` as never)}</span>
          </div>
          <Row
            icon={<KeyRound size={18} />}
            title={t('settings.aiSeeKeys')}
            subtitle={t('settings.aiSeeKeysHint')}
            right={<Switch checked={s.aiCanSeeKeys} onChange={(v) => set({ aiCanSeeKeys: v })} />}
          />
          {s.alwaysAllow.length > 0 && (
            <Row
              title={t('settings.alwaysAllowed', { n: s.alwaysAllow.length })}
              subtitle={s.alwaysAllow.join(', ')}
              right={
                <Button size="sm" variant="ghost" onClick={() => set({ alwaysAllow: [] })}>
                  {t('common.reset')}
                </Button>
              }
            />
          )}
        </Section>

        <Section title={t('settings.builtinTools')}>
          {groups.map((g) => {
            const names = tools.filter((x) => x.group === g.key);
            return (
              <Row
                key={g.key}
                icon={<Wrench size={17} />}
                title={g.label}
                subtitle={
                  <>
                    {g.hint}
                    <span className="tool-names">
                      {names.map((n) => (
                        <Badge key={n.name} tone={n.readOnly ? 'neutral' : 'warn'}>
                          {n.name}
                        </Badge>
                      ))}
                    </span>
                  </>
                }
                right={<Switch checked={s.tools[g.key]} onChange={(v) => set({ tools: { ...s.tools, [g.key]: v } })} />}
              />
            );
          })}
        </Section>

        <Section title={t('settings.network')} footer={t('settings.corsFooter')}>
          <div className="form">
            <Field label={<><Globe size={15} /> {t('settings.corsProxy')}</>} hint={t('settings.corsHint')}>
              <Debounced value={s.corsProxy} onCommit={(v) => set({ corsProxy: v.trim() })} placeholder="https://my-proxy.workers.dev/?url={url}" />
            </Field>
          </div>
        </Section>

        <Section title={t('settings.data')}>
          <Row icon={<Download size={18} />} title={t('settings.export')} subtitle={t('settings.exportHint')} onClick={() => setExportOpen(true)} chevron />
          <Row
            icon={<Upload size={18} />}
            title={t('settings.import')}
            subtitle={t('settings.importHint')}
            onClick={async () => {
              const [f] = await pickFiles('application/json,.json');
              if (!f) return;
              const replace = await confirmDialog({ title: t('settings.importMode'), message: t('settings.importModeText'), confirmLabel: t('settings.importReplace') });
              try {
                await importAll(f, replace ? 'replace' : 'merge');
                toast(t('settings.imported'), 'success');
              } catch (e) {
                toast(errorMessage(e), 'error');
              }
            }}
            chevron
          />
          <Row icon={<ScrollText size={18} />} title={t('settings.logBodies')} subtitle={t('settings.logBodiesHint')} right={<Switch checked={s.logBodies} onChange={(v) => set({ logBodies: v })} />} />
          <div className="form">
            <Field label={t('settings.logRetention')}>
              <TextInput inputMode="numeric" value={String(s.logRetention)} onChange={(e) => set({ logRetention: Math.max(100, Number(e.target.value.replace(/\D/g, '')) || 100) })} />
            </Field>
          </div>
          <Row icon={<Database size={18} />} title={t('settings.storage')} detail={storage || '—'} />
          <Row
            danger
            icon={<Trash2 size={18} />}
            title={t('settings.wipe')}
            onClick={async () => {
              if (await confirmDialog({ title: t('settings.wipeConfirm'), message: t('settings.wipeText'), danger: true, confirmLabel: t('settings.wipe') })) {
                await wipeAll();
                navigate('/', true);
              }
            }}
          />
        </Section>

        <Section title={t('settings.about')}>
          <Row title="Cove" detail={`v${__APP_VERSION__}`} />
          <Row
            title={t('settings.source')}
            right={
              <IconButton label="GitHub" onClick={() => window.open(REPO_URL, '_blank', 'noopener')}>
                <ExternalLink size={17} />
              </IconButton>
            }
          />
        </Section>
        <p className="fine">{t('settings.privacy')}</p>
      </Screen>

      <ModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        providerId={s.defaultProviderId}
        model={s.defaultModel}
        onPick={(providerId, model) => set({ defaultProviderId: providerId, defaultModel: model })}
      />
      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t('settings.export')}
        size="sm"
        footer={
          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={() => {
              void exportAll({ includeKeys: withKeys, includeLogs: withLogs });
              setExportOpen(false);
            }}
          >
            {t('settings.download')}
          </Button>
        }
      >
        <Section>
          <Row icon={<KeyRound size={18} />} title={t('settings.includeKeys')} subtitle={t('settings.includeKeysHint')} right={<Switch checked={withKeys} onChange={setWithKeys} />} />
          <Row icon={<ScrollText size={18} />} title={t('settings.includeLogs')} right={<Switch checked={withLogs} onChange={setWithLogs} />} />
        </Section>
      </Sheet>
    </>
  );
}
