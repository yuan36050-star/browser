import { Check, Plus, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { navigate } from '../lib/router';
import { upsertProvider, useApp } from '../lib/store';
import { Button, cx, Empty, Sheet, TextInput } from './ui';

export function ModelPicker({
  open,
  onClose,
  providerId,
  model,
  onPick,
  allowInherit,
}: {
  open: boolean;
  onClose: () => void;
  providerId?: string;
  model?: string;
  onPick: (providerId: string | undefined, model: string | undefined) => void;
  allowInherit?: string;
}) {
  const t = useT();
  const allProviders = useApp((s) => s.providers);
  const providers = useMemo(() => allProviders.filter((p) => p.enabled), [allProviders]);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const total = providers.reduce((n, p) => n + p.models.length, 0);

  const filtered = useMemo(
    () =>
      providers.map((p) => ({
        p,
        models: p.models.filter((m) => !q || m.id.toLowerCase().includes(q.toLowerCase()) || m.label?.toLowerCase().includes(q.toLowerCase())),
      })),
    [providers, q],
  );

  return (
    <Sheet open={open} onClose={onClose} title={t('model.title')}>
      {!providers.length ? (
        <Empty
          title={t('err.noProvider')}
          text={t('err.noProviderText')}
          action={
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                navigate('/providers');
              }}
            >
              {t('providers.add')}
            </Button>
          }
        />
      ) : (
        <>
          {total > 8 && (
            <div className="search-box">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('model.search')} autoCapitalize="off" autoCorrect="off" />
            </div>
          )}
          {allowInherit && (
            <button className={cx('pick-row', !providerId && !model && 'on')} onClick={() => { onPick(undefined, undefined); onClose(); }}>
              <span className="pick-main">
                <span className="pick-title">{allowInherit}</span>
              </span>
              {!providerId && !model && <Check size={18} />}
            </button>
          )}
          {filtered.map(({ p, models }) => (
            <div key={p.id} className="pick-group">
              <div className="pick-group-head">
                <span>{p.name}</span>
                <span className="pick-kind">{p.kind === 'anthropic' ? 'Anthropic' : 'OpenAI'}</span>
              </div>
              {models.map((m) => {
                const on = p.id === providerId && m.id === model;
                return (
                  <button
                    key={m.id}
                    className={cx('pick-row', on && 'on')}
                    onClick={() => {
                      onPick(p.id, m.id);
                      onClose();
                    }}
                  >
                    <span className="pick-main">
                      <span className="pick-title">{m.label || m.id}</span>
                      {m.label && m.label !== m.id && <span className="pick-sub">{m.id}</span>}
                    </span>
                    {on && <Check size={18} />}
                  </button>
                );
              })}
              <div className="pick-custom">
                <TextInput
                  value={custom[p.id] ?? ''}
                  placeholder={t('model.customId')}
                  onChange={(e) => setCustom({ ...custom, [p.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && custom[p.id]?.trim()) {
                      const id = custom[p.id].trim();
                      if (!p.models.some((m) => m.id === id)) upsertProvider({ ...p, models: [...p.models, { id }] });
                      onPick(p.id, id);
                      onClose();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Plus size={15} />}
                  disabled={!custom[p.id]?.trim()}
                  onClick={() => {
                    const id = custom[p.id].trim();
                    if (!p.models.some((m) => m.id === id)) upsertProvider({ ...p, models: [...p.models, { id }] });
                    onPick(p.id, id);
                    onClose();
                  }}
                />
              </div>
            </div>
          ))}
          <div className="sheet-links">
            <Button
              variant="ghost"
              icon={<Settings2 size={16} />}
              onClick={() => {
                onClose();
                navigate('/providers');
              }}
            >
              {t('model.manage')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
