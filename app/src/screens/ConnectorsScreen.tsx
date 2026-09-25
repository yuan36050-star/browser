import { ChevronDown, LogIn, Plug, Plus, RefreshCw, Trash2, Unplug } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  cx,
  Empty,
  Field,
  IconButton,
  KeyValueEditor,
  Row,
  Screen,
  ScreenBar,
  Section,
  Segmented,
  Sheet,
  StatusDot,
  Switch,
  TextInput,
} from '../components/ui';
import { useT } from '../i18n';
import { confirmDialog } from '../lib/dialog';
import * as MCP from '../lib/mcp/client';
import { goBack, navigate } from '../lib/router';
import { deleteConnector, getState, patchConnector, toast, upsertConnector, useApp } from '../lib/store';
import type { Connector } from '../lib/types';
import { errorMessage, now, uid } from '../lib/util';

interface ConnectorPreset {
  id: 'custom' | 'browser' | 'oauth';
  url: string;
  auth: Connector['auth'];
}

const PRESETS: ConnectorPreset[] = [
  { id: 'custom', url: '', auth: 'none' },
  { id: 'browser', url: 'https://your-browser-host/mcp', auth: 'basic' },
  { id: 'oauth', url: '', auth: 'oauth' },
];

function newConnector(p?: ConnectorPreset): Connector {
  return {
    id: uid('mc_'),
    name: p?.id === 'browser' ? 'Browser' : '',
    url: p?.url ?? '',
    transport: 'auto',
    auth: p?.auth ?? 'none',
    token: '',
    headers: [],
    mode: 'client',
    enabled: true,
    autoApprove: false,
    disabledTools: [],
    useCorsProxy: false,
    createdAt: now(),
    updatedAt: now(),
  };
}

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url || '—';
  }
}

export function ConnectorsList() {
  const t = useT();
  const connectors = useApp((s) => s.connectors);
  const mcp = useApp((s) => s.mcp);
  const [presetOpen, setPresetOpen] = useState(false);
  return (
    <>
      <ScreenBar
        title={t('nav.connectors')}
        right={
          <IconButton label={t('connectors.add')} onClick={() => setPresetOpen(true)}>
            <Plus size={21} />
          </IconButton>
        }
      />
      <Screen>
        <p className="lead">{t('connectors.lead')}</p>
        {connectors.length === 0 ? (
          <Empty
            icon={<Plug size={28} />}
            title={t('connectors.empty')}
            text={t('connectors.emptyText')}
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setPresetOpen(true)}>
                {t('connectors.add')}
              </Button>
            }
          />
        ) : (
          <Section>
            {connectors.map((c) => (
              <Row
                key={c.id}
                icon={<StatusDot state={c.enabled ? mcp[c.id]?.state ?? 'idle' : 'off'} />}
                title={c.name}
                subtitle={`${host(c.url)} · ${c.mode === 'api' ? t('connectors.modeApi') : `${c.toolCache?.length ?? 0} ${t('connectors.tools')}`}${c.auth === 'oauth' ? ' · OAuth' : ''}`}
                right={<Switch checked={c.enabled} onChange={(v) => patchConnector(c.id, { enabled: v })} />}
                onClick={() => navigate(`/connectors/${c.id}`)}
              />
            ))}
          </Section>
        )}
      </Screen>
      <Sheet open={presetOpen} onClose={() => setPresetOpen(false)} title={t('connectors.add')}>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset"
              onClick={() => {
                setPresetOpen(false);
                navigate(`/connectors/new?preset=${p.id}`);
              }}
            >
              <strong>{t(`connectors.preset.${p.id}`)}</strong>
              <span>{t(`connectors.preset.${p.id}Note`)}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

export function ConnectorEditor({ id, preset }: { id: string; preset?: string }) {
  const t = useT();
  const stored = useApp((s) => s.connectors.find((c) => c.id === id));
  const status = useApp((s) => (stored ? s.mcp[stored.id] : undefined));
  const [draft, setDraft] = useState<Connector | null>(() =>
    id === 'new' ? newConnector(PRESETS.find((p) => p.id === preset)) : stored ? structuredClone(stored) : null,
  );
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const isNew = !stored;
  const presetId = PRESETS.find((p) => p.id === preset)?.id;
  const presetNote = presetId ? t(`connectors.preset.${presetId}Note`) : undefined;

  if (!draft) {
    return (
      <>
        <ScreenBar title={t('nav.connectors')} back="/connectors" />
        <Empty title={t('common.notFound')} />
      </>
    );
  }
  const set = (patch: Partial<Connector>) => setDraft({ ...draft, ...patch });
  const live = stored ? { ...draft, oauth: stored.oauth, toolCache: stored.toolCache, disabledTools: stored.disabledTools } : draft;
  const tools = stored?.toolCache ?? [];

  const persist = (): Connector | null => {
    if (!draft.url.trim()) {
      toast(t('connectors.urlRequired'), 'error');
      return null;
    }
    const c = { ...live, name: draft.name.trim() || host(draft.url), url: draft.url.trim() };
    upsertConnector(c);
    return c;
  };

  const test = async () => {
    const c = persist();
    if (!c) return;
    if (isNew) navigate(`/connectors/${c.id}`, true);
    if (c.mode === 'api') {
      toast(t('connectors.apiModeTest'), 'info');
      return;
    }
    setBusy(true);
    try {
      await MCP.disconnect(c.id);
      const list = await MCP.listTools(getState().connectors.find((x) => x.id === c.id)!, true);
      toast(t('connectors.connected', { n: list.length }), 'success');
    } catch (e) {
      if (e instanceof MCP.AuthRequiredError) toast(t('connectors.signInNeeded'), 'info');
      else toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenBar
        title={isNew ? t('connectors.new') : draft.name || t('nav.connectors')}
        back="/connectors"
        right={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (persist()) {
                toast(t('common.saved'), 'success');
                if (isNew) navigate('/connectors', true);
                else goBack('/connectors');
              }
            }}
          >
            {t('common.save')}
          </Button>
        }
      />
      <Screen narrow>
        {isNew && presetNote && <p className="lead">{presetNote}</p>}
        <Section>
          <div className="form">
            <Field label={t('connectors.name')}>
              <TextInput value={draft.name} placeholder="browser" onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label={t('connectors.url')} hint={t('connectors.urlHint')}>
              <TextInput value={draft.url} inputMode="url" placeholder="https://example.com/mcp" onChange={(e) => set({ url: e.target.value })} />
            </Field>
            <Field label={t('connectors.mode')} hint={draft.mode === 'client' ? t('connectors.modeClientHint') : t('connectors.modeApiHint')}>
              <Segmented
                value={draft.mode}
                onChange={(v) => set({ mode: v })}
                options={[
                  { value: 'client', label: t('connectors.modeClient') },
                  { value: 'api', label: t('connectors.modeApi') },
                ]}
              />
            </Field>
            <Field label={t('connectors.auth')}>
              <Segmented
                value={draft.auth}
                onChange={(v) => set({ auth: v })}
                options={[
                  { value: 'none', label: t('connectors.authNone') },
                  { value: 'bearer', label: 'Bearer' },
                  { value: 'basic', label: 'Basic' },
                  { value: 'oauth', label: 'OAuth' },
                ]}
              />
            </Field>
            {(draft.auth === 'bearer' || draft.auth === 'basic') && (
              <Field label={draft.auth === 'basic' ? t('connectors.basic') : t('connectors.token')} hint={draft.auth === 'basic' ? t('connectors.basicHint') : t('connectors.tokenHint')}>
                <TextInput type="password" value={draft.token} autoComplete="off" placeholder={draft.auth === 'basic' ? 'user:password' : ''} onChange={(e) => set({ token: e.target.value })} />
              </Field>
            )}
          </div>
        </Section>

        <Section>
          <Row
            icon={<StatusDot state={status?.state ?? 'idle'} />}
            title={t(`mcp.${status?.state ?? 'idle'}` as never)}
            subtitle={status?.error ?? status?.serverName ?? (draft.mode === 'api' ? t('connectors.apiModeTest') : undefined)}
            right={
              <span className="inline-actions">
                {draft.auth === 'oauth' && (status?.state === 'auth' || !stored?.oauth?.tokens) && (
                  <Button size="sm" icon={<LogIn size={15} />} loading={busy} onClick={() => void test()}>
                    {t('connectors.signIn')}
                  </Button>
                )}
                <Button size="sm" icon={<RefreshCw size={15} />} loading={busy} onClick={() => void test()}>
                  {t('connectors.test')}
                </Button>
              </span>
            }
          />
          {stored?.oauth?.tokens && (
            <Row
              icon={<Unplug size={18} />}
              title={t('connectors.signOut')}
              onClick={() => {
                patchConnector(stored.id, { oauth: undefined });
                void MCP.disconnect(stored.id);
              }}
            />
          )}
          <Row title={t('connectors.autoApprove')} subtitle={t('connectors.autoApproveHint')} right={<Switch checked={draft.autoApprove} onChange={(v) => set({ autoApprove: v })} />} />
          <Row title={t('common.enabled')} right={<Switch checked={draft.enabled} onChange={(v) => set({ enabled: v })} />} />
        </Section>

        {tools.length > 0 && (
          <Section title={`${t('connectors.tools')} (${tools.length})`} footer={t('connectors.toolsHint')}>
            {tools.map((tool) => {
              const off = stored?.disabledTools.includes(tool.name);
              return (
                <Row
                  key={tool.name}
                  title={
                    <>
                      {tool.title ?? tool.name} {tool.readOnly && <Badge tone="success">{t('connectors.readOnly')}</Badge>}
                    </>
                  }
                  subtitle={tool.description?.slice(0, 160)}
                  right={
                    <Switch
                      checked={!off}
                      onChange={(v) =>
                        stored &&
                        patchConnector(stored.id, {
                          disabledTools: v ? stored.disabledTools.filter((x) => x !== tool.name) : [...stored.disabledTools, tool.name],
                        })
                      }
                    />
                  }
                />
              );
            })}
          </Section>
        )}

        <button className="disclosure" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          <span>{t('common.advanced')}</span>
          <ChevronDown size={16} className={cx('chev', advanced && 'up')} />
        </button>
        {advanced && (
          <>
            <Section>
              <div className="form">
                <Field label={t('connectors.transport')}>
                  <Segmented
                    size="sm"
                    value={draft.transport}
                    onChange={(v) => set({ transport: v })}
                    options={[
                      { value: 'auto', label: t('connectors.auto') },
                      { value: 'streamable-http', label: 'Streamable HTTP' },
                      { value: 'sse', label: 'SSE' },
                    ]}
                  />
                </Field>
              </div>
              <Row title={t('providers.corsProxy')} subtitle={t('providers.corsProxyHint')} right={<Switch checked={draft.useCorsProxy} onChange={(v) => set({ useCorsProxy: v })} />} />
            </Section>
            <Section title={t('providers.headers')}>
              <div className="form">
                <KeyValueEditor items={draft.headers} onChange={(headers) => set({ headers })} keyPlaceholder="Header" valuePlaceholder={t('common.value')} addLabel={t('providers.addHeader')} />
              </div>
            </Section>
          </>
        )}

        {stored && (
          <Section>
            <Row
              danger
              icon={<Trash2 size={18} />}
              title={t('connectors.delete')}
              onClick={async () => {
                if (await confirmDialog({ title: t('connectors.deleteConfirm', { name: stored.name }), danger: true, confirmLabel: t('common.delete') })) {
                  await MCP.disconnect(stored.id);
                  deleteConnector(stored.id);
                  navigate('/connectors', true);
                }
              }}
            />
          </Section>
        )}
      </Screen>
    </>
  );
}
