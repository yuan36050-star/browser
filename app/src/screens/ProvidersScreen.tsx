import { CheckCircle2, ChevronDown, Download, Eye, EyeOff, Plus, Server, Star, Trash2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  cx,
  Empty,
  Field,
  IconButton,
  KeyValueEditor,
  Row,
  Page,
    Section,
  Segmented,
  Sheet,
  Switch,
  TextArea,
  TextInput,
} from '../components/ui';
import { useT } from '../i18n';
import { confirmDialog } from '../lib/dialog';
import { fetchModels, newProvider, PRESETS, testProvider } from '../lib/providers';
import { goBack, navigate } from '../lib/router';
import { deleteProvider, getState, toast, updateSettings, upsertProvider, useApp } from '../lib/store';
import type { ModelInfo, Provider } from '../lib/types';
import { errorMessage, maskSecret } from '../lib/util';

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url || '—';
  }
}

export function ProvidersList() {
  const t = useT();
  const providers = useApp((s) => s.providers);
  const defaultId = useApp((s) => s.settings.defaultProviderId);
  const [presetOpen, setPresetOpen] = useState(false);
  return (
    <>
      <Page
        title={t('nav.providers')}
        back="/settings"
        right={
          <IconButton label={t('providers.add')} onClick={() => setPresetOpen(true)}>
            <Plus size={21} />
          </IconButton>
        }>
        <p className="lead">{t('providers.lead')}</p>
        {providers.length === 0 ? (
          <Empty
            icon={<Server size={28} />}
            title={t('providers.empty')}
            text={t('providers.emptyText')}
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setPresetOpen(true)}>
                {t('providers.add')}
              </Button>
            }
          />
        ) : (
          <Section>
            {providers.map((p) => (
              <Row
                key={p.id}
                icon={<Server size={18} />}
                title={
                  <>
                    {p.name} {p.id === defaultId && <Star size={13} className="inline-star" />}
                  </>
                }
                subtitle={`${p.kind === 'anthropic' ? 'Anthropic' : 'OpenAI'} · ${host(p.baseURL)} · ${t('providers.modelsCount', { n: p.models.length })}${p.apiKeys.filter(Boolean).length > 1 ? ` · ${t('providers.keysCount', { n: p.apiKeys.filter(Boolean).length })}` : ''}`}
                right={!p.enabled ? <Badge>{t('common.off')}</Badge> : undefined}
                onClick={() => navigate(`/providers/${p.id}`)}
                chevron
              />
            ))}
          </Section>
        )}
      </Page>
      <Sheet open={presetOpen} onClose={() => setPresetOpen(false)} title={t('providers.choosePreset')}>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset"
              onClick={() => {
                setPresetOpen(false);
                navigate(`/providers/new?preset=${p.id}`);
              }}
            >
              <strong>{p.name}</strong>
              <span>{p.kind === 'anthropic' ? t('providers.formatAnthropic') : t('providers.formatOpenAI')}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function FetchModelsSheet({
  open,
  onClose,
  models,
  existing,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  models: ModelInfo[];
  existing: ModelInfo[];
  onAdd: (m: ModelInfo[]) => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Pre-select fetched models that are already configured.
    if (open) setSel(new Set(models.filter((m) => existing.some((e) => e.id === m.id)).map((m) => m.id)));
  }, [open, models, existing]);
  const list = useMemo(() => models.filter((m) => !q || m.id.toLowerCase().includes(q.toLowerCase())), [models, q]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('providers.fetchedModels', { n: models.length })}
      footer={
        <>
          <Button variant="ghost" onClick={() => setSel(new Set(list.map((m) => m.id)))}>
            {t('common.selectAll')}
          </Button>
          <Button variant="ghost" onClick={() => setSel(new Set())}>
            {t('common.selectNone')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // Selected fetched models, plus manually added ids the server did not list.
              const keep = models.filter((m) => sel.has(m.id));
              const manual = existing.filter((m) => !models.some((x) => x.id === m.id));
              onAdd([...keep, ...manual]);
              onClose();
            }}
          >
            {t('providers.useSelected', { n: sel.size })}
          </Button>
        </>
      }
    >
      <div className="search-box">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('model.search')} autoCapitalize="off" />
      </div>
      <div className="check-list">
        {list.map((m) => (
          <label key={m.id} className="check-row">
            <input
              type="checkbox"
              checked={sel.has(m.id)}
              onChange={(e) => {
                const n = new Set(sel);
                if (e.target.checked) n.add(m.id);
                else n.delete(m.id);
                setSel(n);
              }}
            />
            <span>{m.id}</span>
            {m.label && m.label !== m.id && <span className="muted"> {m.label}</span>}
          </label>
        ))}
      </div>
    </Sheet>
  );
}

export function ProviderEditor({ id, preset }: { id: string; preset?: string }) {
  const t = useT();
  const existing = useApp((s) => s.providers.find((p) => p.id === id));
  const defaultId = useApp((s) => s.settings.defaultProviderId);
  const [draft, setDraft] = useState<Provider | null>(() =>
    id === 'new' ? newProvider(PRESETS.find((p) => p.id === preset)) : existing ? structuredClone(existing) : null,
  );
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const [newModel, setNewModel] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState<ModelInfo[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [bodyError, setBodyError] = useState('');
  const isNew = id === 'new' || !existing;
  const presetInfo = PRESETS.find((p) => p.id === preset);

  if (!draft) {
    return (
      <>
        <Page title={t('nav.providers')} back="/providers">
          <Empty title={t('common.notFound')} />
        </Page>
      </>
    );
  }
  const set = (patch: Partial<Provider>) => setDraft({ ...draft, ...patch });

  const validate = (): boolean => {
    if (draft.extraBody.trim()) {
      try {
        const v = JSON.parse(draft.extraBody);
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
      } catch {
        setBodyError(t('providers.extraBodyInvalid'));
        setAdvanced(true);
        return false;
      }
    }
    setBodyError('');
    return true;
  };

  const save = (leave = true) => {
    if (!validate()) return false;
    const clean = { ...draft, name: draft.name.trim() || 'Provider', baseURL: draft.baseURL.trim(), apiKeys: draft.apiKeys.map((k) => k.trim()) };
    upsertProvider(clean);
    if (!getState().settings.defaultProviderId) updateSettings({ defaultProviderId: clean.id, defaultModel: clean.models[0]?.id });
    toast(t('common.saved'), 'success');
    if (leave) {
      if (isNew) navigate('/providers', true);
      else goBack('/providers');
    }
    return true;
  };

  const doFetch = async () => {
    setFetching(true);
    try {
      const models = await fetchModels(draft);
      if (!models.length) toast(t('providers.noModelsReturned'), 'error');
      else setFetched(models);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setFetching(false);
    }
  };

  const doTest = async () => {
    const model = draft.models[0]?.id;
    if (!model) {
      toast(t('providers.addModelFirst'), 'error');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const out = await testProvider(draft, model);
      setTestResult({ ok: true, text: `${model}: ${out.slice(0, 200)}` });
    } catch (e) {
      setTestResult({ ok: false, text: errorMessage(e) });
    } finally {
      setTesting(false);
    }
  };

  const addModel = () => {
    const m = newModel.trim();
    if (!m || draft.models.some((x) => x.id === m)) return;
    set({ models: [...draft.models, { id: m }] });
    setNewModel('');
  };

  return (
    <>
      <Page
        title={isNew ? t('providers.new') : draft.name}
        back="/providers"
        right={
          <Button size="sm" variant="primary" onClick={() => save()}>
            {t('common.save')}
          </Button>
        } narrow>
        {presetInfo?.id === 'cc-bridge' && isNew && <p className="lead">{t('providers.bridgeNote')}</p>}
        <Section>
          <div className="form">
            <Field label={t('providers.name')}>
              <TextInput value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label={t('providers.format')} hint={draft.kind === 'anthropic' ? t('providers.formatAnthropicHint') : t('providers.formatOpenAIHint')}>
              <Segmented
                value={draft.kind}
                onChange={(v) => set({ kind: v, promptCaching: v === 'anthropic' ? draft.promptCaching : false })}
                options={[
                  { value: 'anthropic', label: 'Anthropic' },
                  { value: 'openai', label: 'OpenAI' },
                ]}
              />
            </Field>
            <Field label={t('providers.baseUrl')} hint={draft.kind === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.example.com/v1'}>
              <TextInput value={draft.baseURL} inputMode="url" placeholder={draft.kind === 'anthropic' ? 'https://api.anthropic.com' : 'https://…/v1'} onChange={(e) => set({ baseURL: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title={t('providers.keys')} footer={t('providers.keysHint')}>
          <div className="form">
            {draft.apiKeys.map((k, i) => (
              <div className="key-row" key={i}>
                <TextInput
                  type={reveal[i] ? 'text' : 'password'}
                  value={k}
                  placeholder={t('providers.keyPlaceholder')}
                  autoComplete="off"
                  onChange={(e) => set({ apiKeys: draft.apiKeys.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <IconButton label={reveal[i] ? t('common.hide') : t('common.show')} onClick={() => setReveal({ ...reveal, [i]: !reveal[i] })}>
                  {reveal[i] ? <EyeOff size={17} /> : <Eye size={17} />}
                </IconButton>
                {draft.apiKeys.length > 1 && (
                  <IconButton label={t('common.remove')} onClick={() => set({ apiKeys: draft.apiKeys.filter((_, j) => j !== i) })}>
                    <X size={17} />
                  </IconButton>
                )}
              </div>
            ))}
            <div className="inline-actions">
              <Button size="sm" variant="ghost" icon={<Plus size={15} />} onClick={() => set({ apiKeys: [...draft.apiKeys, ''] })}>
                {t('providers.addKey')}
              </Button>
              {draft.apiKeys.length > 1 && (
                <Segmented
                  size="sm"
                  value={draft.keyStrategy}
                  onChange={(v) => set({ keyStrategy: v })}
                  options={[
                    { value: 'failover', label: t('providers.failover') },
                    { value: 'round-robin', label: t('providers.roundRobin') },
                  ]}
                />
              )}
            </div>
            {draft.kind === 'anthropic' && (
              <Field label={t('providers.authStyle')}>
                <Segmented
                  size="sm"
                  value={draft.authStyle}
                  onChange={(v) => set({ authStyle: v })}
                  options={[
                    { value: 'x-api-key', label: 'x-api-key' },
                    { value: 'bearer', label: 'Authorization: Bearer' },
                  ]}
                />
              </Field>
            )}
          </div>
        </Section>

        <Section
          title={t('providers.models')}
          action={
            <Button size="sm" variant="ghost" icon={<Download size={15} />} loading={fetching} onClick={() => void doFetch()}>
              {t('providers.fetch')}
            </Button>
          }
        >
          <div className="form">
            <div className="chips">
              {draft.models.map((m) => (
                <span key={m.id} className="chip">
                  {m.label && m.label !== m.id ? `${m.label}` : m.id}
                  <button aria-label={t('common.remove')} onClick={() => set({ models: draft.models.filter((x) => x.id !== m.id) })}>
                    <X size={13} />
                  </button>
                </span>
              ))}
              {!draft.models.length && <span className="muted">{t('providers.noModels')}</span>}
            </div>
            <div className="key-row">
              <TextInput value={newModel} placeholder={t('providers.addModelPlaceholder')} onChange={(e) => setNewModel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addModel()} />
              <Button size="sm" onClick={addModel} disabled={!newModel.trim()}>
                {t('common.add')}
              </Button>
            </div>
          </div>
        </Section>

        <Section>
          <Row
            icon={<Zap size={18} />}
            title={t('providers.test')}
            subtitle={testResult ? <span className={cx(testResult.ok ? 'ok-text' : 'err-text')}>{testResult.text}</span> : t('providers.testHint')}
            right={
              <Button size="sm" loading={testing} onClick={() => void doTest()}>
                {t('providers.run')}
              </Button>
            }
          />
          <Row
            icon={<Star size={18} />}
            title={t('providers.default')}
            subtitle={defaultId === draft.id ? t('providers.isDefault') : t('providers.defaultHint')}
            right={
              defaultId === draft.id ? (
                <CheckCircle2 size={20} className="ok-text" />
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    if (save(false)) updateSettings({ defaultProviderId: draft.id, defaultModel: draft.models[0]?.id });
                  }}
                >
                  {t('providers.makeDefault')}
                </Button>
              )
            }
          />
          <Row title={t('common.enabled')} right={<Switch checked={draft.enabled} onChange={(v) => set({ enabled: v })} />} />
        </Section>

        <button className="disclosure" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          <span>{t('common.advanced')}</span>
          <ChevronDown size={16} className={cx('chev', advanced && 'up')} />
        </button>
        {advanced && (
          <>
            <Section>
              {draft.kind === 'anthropic' && (
                <>
                  <Row title={t('providers.caching')} subtitle={t('providers.cachingHint')} right={<Switch checked={draft.promptCaching} onChange={(v) => set({ promptCaching: v })} />} />
                  <Row title={t('providers.serverTools')} subtitle={t('providers.serverToolsHint')} right={<Switch checked={draft.serverTools} onChange={(v) => set({ serverTools: v })} />} />
                  <Row title={t('providers.fallback')} subtitle={t('providers.fallbackHint')} right={<Switch checked={draft.refusalFallback} onChange={(v) => set({ refusalFallback: v })} />} />
                </>
              )}
              {draft.kind === 'openai' && (
                <Row title={t('providers.streamUsage')} subtitle={t('providers.streamUsageHint')} right={<Switch checked={draft.streamUsage} onChange={(v) => set({ streamUsage: v })} />} />
              )}
              <Row title={t('providers.corsProxy')} subtitle={t('providers.corsProxyHint')} right={<Switch checked={draft.useCorsProxy} onChange={(v) => set({ useCorsProxy: v })} />} />
            </Section>
            <Section title={t('providers.headers')}>
              <div className="form">
                <KeyValueEditor
                  items={draft.headers}
                  onChange={(headers) => set({ headers })}
                  keyPlaceholder="Header"
                  valuePlaceholder={t('common.value')}
                  addLabel={t('providers.addHeader')}
                />
              </div>
            </Section>
            <Section title={t('providers.extraBody')} footer={t('providers.extraBodyHint')}>
              <div className="form">
                {draft.kind === 'anthropic' && (
                  <Field label="anthropic-beta">
                    <TextInput value={draft.betas} placeholder="beta-flag-1, beta-flag-2" onChange={(e) => set({ betas: e.target.value })} />
                  </Field>
                )}
                <Field label={t('providers.maxTokens')} hint={draft.kind === 'anthropic' ? t('providers.maxTokensHintAnthropic') : t('providers.maxTokensHintOpenAI')}>
                  <TextInput
                    inputMode="numeric"
                    value={draft.maxTokens ? String(draft.maxTokens) : ''}
                    placeholder={draft.kind === 'anthropic' ? t('settings.auto') : t('providers.serverDefault')}
                    onChange={(e) => set({ maxTokens: Number(e.target.value.replace(/\D/g, '')) || undefined })}
                  />
                </Field>
                <Field label="JSON" error={bodyError}>
                  <TextArea className="mono" rows={4} value={draft.extraBody} placeholder='{"top_p": 0.9}' onChange={(e) => set({ extraBody: e.target.value })} />
                </Field>
              </div>
            </Section>
          </>
        )}

        {!isNew && (
          <Section>
            <Row
              danger
              icon={<Trash2 size={18} />}
              title={t('providers.delete')}
              onClick={async () => {
                if (await confirmDialog({ title: t('providers.deleteConfirm', { name: draft.name }), danger: true, confirmLabel: t('common.delete') })) {
                  deleteProvider(draft.id);
                  navigate('/providers', true);
                }
              }}
            />
          </Section>
        )}
        <p className="fine">{t('providers.storageNote', { masked: maskSecret(draft.apiKeys[0] ?? '') || '—' })}</p>
      </Page>
      <FetchModelsSheet open={!!fetched} onClose={() => setFetched(null)} models={fetched ?? []} existing={draft.models} onAdd={(models) => set({ models })} />
    </>
  );
}
