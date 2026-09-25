import { Bot, Box, Copy, Eye, EyeOff, Lock, Pin, Plus, Sparkles, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, cx, Empty, Field, IconButton, Row, Screen, ScreenBar, Section, Segmented, Sheet, Switch, TextArea, TextInput } from '../components/ui';
import { useT } from '../i18n';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { newPod, removeEntry, writeEntry } from '../lib/pods';
import { navigate } from '../lib/router';
import { createConversation, deletePod, toast, upsertPod, useApp } from '../lib/store';
import type { Pod, PodAccess, PodEntry } from '../lib/types';
import { copyText } from '../lib/util';
import { sendMessage } from '../lib/agent';

function relTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return new Date(ts).toLocaleDateString();
}

function askAi(prompt: string) {
  const c = createConversation({});
  navigate(`/c/${c.id}`);
  void sendMessage(c.id, prompt, []);
}

export function PodsList() {
  const t = useT();
  const pods = useApp((s) => s.pods);
  const hasProvider = useApp((s) => s.providers.length > 0);
  const create = async () => {
    const name = await promptDialog({ title: t('pods.new'), field: { value: '', placeholder: t('pods.namePlaceholder') } });
    if (!name?.trim()) return;
    const p = newPod({ name: name.trim() });
    upsertPod(p);
    navigate(`/pods/${p.id}`);
  };
  return (
    <>
      <ScreenBar
        title={t('nav.pods')}
        right={
          <IconButton label={t('pods.new')} onClick={() => void create()}>
            <Plus size={21} />
          </IconButton>
        }
      />
      <Screen>
        <p className="lead">{t('pods.lead')}</p>
        {pods.length === 0 ? (
          <Empty
            icon={<Box size={28} />}
            title={t('pods.empty')}
            text={t('pods.emptyText')}
            action={
              <div className="inline-actions center">
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => void create()}>
                  {t('pods.new')}
                </Button>
                {hasProvider && (
                  <Button icon={<Sparkles size={16} />} onClick={() => askAi(t('pods.askSetup'))}>
                    {t('pods.askAi')}
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <>
            <div className="card-grid">
              {pods.map((p) => (
                <button key={p.id} className="card" onClick={() => navigate(`/pods/${p.id}`)}>
                  <span className="card-emoji">{p.emoji}</span>
                  <span className="card-title">
                    {p.name}
                    {p.secret && <Lock size={13} />}
                    {p.pinned && <Pin size={13} />}
                  </span>
                  {p.description && <span className="card-text">{p.description}</span>}
                  <span className="card-meta">
                    {t('pods.entries', { n: p.entries.length })} · <Badge tone={p.aiAccess === 'none' ? 'neutral' : 'accent'}>{t(`access.${p.aiAccess}` as never)}</Badge>
                    {p.createdBy === 'ai' && <Badge tone="warn">{t('pods.byAi')}</Badge>}
                  </span>
                </button>
              ))}
            </div>
            {hasProvider && (
              <div className="inline-actions center pad">
                <Button variant="ghost" icon={<Sparkles size={16} />} onClick={() => askAi(t('pods.askTidy'))}>
                  {t('pods.askTidyButton')}
                </Button>
              </div>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

function EntrySheet({ pod, entry, open, onClose }: { pod: Pod; entry: PodEntry | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const [key, setKey] = useState(entry?.key ?? '');
  const [value, setValue] = useState(entry?.value ?? '');
  const save = () => {
    const k = key.trim();
    if (!k) return;
    let p = pod;
    if (entry && entry.key !== k) p = removeEntry(p, entry.key);
    writeEntry(p, k, value, 'user');
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? t('pods.editEntry') : t('pods.addEntry')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={!key.trim()} onClick={save}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="form">
        <Field label={t('pods.key')}>
          <TextInput value={key} autoFocus={!entry} onChange={(e) => setKey(e.target.value)} placeholder="api_token" />
        </Field>
        <Field label={t('common.value')}>
          <TextArea autoGrow rows={4} value={value} onChange={(e) => setValue(e.target.value)} className={cx(pod.secret && 'mono')} />
        </Field>
      </div>
    </Sheet>
  );
}

export function PodDetail({ id }: { id: string }) {
  const t = useT();
  const pod = useApp((s) => s.pods.find((p) => p.id === id));
  const hasProvider = useApp((s) => s.providers.length > 0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ entry: PodEntry | null } | null>(null);

  if (!pod) {
    return (
      <>
        <ScreenBar title={t('nav.pods')} back="/pods" />
        <Empty title={t('common.notFound')} />
      </>
    );
  }
  const set = (patch: Partial<Pod>) => upsertPod({ ...pod, ...patch });
  const accessHint: Record<PodAccess, string> = {
    none: t('access.noneHint'),
    use: t('access.useHint'),
    read: t('access.readHint'),
    write: t('access.writeHint'),
  };

  return (
    <>
      <ScreenBar
        title={`${pod.emoji} ${pod.name}`}
        back="/pods"
        right={
          <IconButton label={t('pods.addEntry')} onClick={() => setEditing({ entry: null })}>
            <Plus size={21} />
          </IconButton>
        }
      />
      <Screen narrow>
        <div className="project-head">
          <button
            className="emoji-btn"
            onClick={async () => {
              const v = await promptDialog({ title: t('common.emoji'), field: { value: pod.emoji } });
              if (v) set({ emoji: [...v.trim()][0] ?? '📦' });
            }}
          >
            {pod.emoji}
          </button>
          <TextInput className="title-input" value={pod.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <Section>
          <div className="form">
            <Field label={t('projects.description')}>
              <TextInput value={pod.description} placeholder={t('pods.descriptionPlaceholder')} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label={t('pods.aiAccess')} hint={accessHint[pod.aiAccess]}>
              <Segmented<PodAccess>
                size="sm"
                value={pod.aiAccess}
                onChange={(v) => set({ aiAccess: v })}
                options={(['none', 'use', 'read', 'write'] as PodAccess[]).map((a) => ({ value: a, label: t(`access.${a}` as never) }))}
              />
            </Field>
          </div>
          <Row icon={<Lock size={18} />} title={t('pods.secret')} subtitle={t('pods.secretHint')} right={<Switch checked={pod.secret} onChange={(v) => set({ secret: v })} />} />
          <Row icon={<Pin size={18} />} title={t('pods.pinned')} subtitle={t('pods.pinnedHint')} right={<Switch checked={!!pod.pinned} onChange={(v) => set({ pinned: v })} />} />
        </Section>

        <Section
          title={t('pods.entries', { n: pod.entries.length })}
          action={
            <Button size="sm" variant="ghost" icon={<Plus size={15} />} onClick={() => setEditing({ entry: null })}>
              {t('common.add')}
            </Button>
          }
        >
          {pod.entries.length === 0 && <Row title={<span className="muted">{t('pods.noEntries')}</span>} />}
          {pod.entries.map((e) => {
            const hidden = pod.secret && !revealed[e.key];
            return (
              <div key={e.key} className="entry" onClick={() => setEditing({ entry: e })}>
                <div className="entry-head">
                  <span className="entry-key">{e.key}</span>
                  <span className="entry-meta">
                    {e.updatedBy === 'ai' ? <Bot size={13} /> : <User size={13} />} {relTime(e.updatedAt)}
                  </span>
                </div>
                <div className={cx('entry-value', hidden && 'masked')}>{hidden ? '••••••••••' : e.value || <span className="muted">—</span>}</div>
                <div className="entry-actions" onClick={(ev) => ev.stopPropagation()}>
                  {pod.secret && (
                    <IconButton label={hidden ? t('common.show') : t('common.hide')} onClick={() => setRevealed({ ...revealed, [e.key]: !revealed[e.key] })}>
                      {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                    </IconButton>
                  )}
                  <IconButton
                    label={t('pods.copyRef')}
                    onClick={() => void copyText(`{{pod:${pod.name}/${e.key}}}`).then(() => toast(t('pods.refCopied'), 'success'))}
                  >
                    <Copy size={15} />
                  </IconButton>
                  <IconButton
                    label={t('common.delete')}
                    onClick={async () => {
                      if (await confirmDialog({ title: t('pods.deleteEntry', { key: e.key }), danger: true, confirmLabel: t('common.delete') })) removeEntry(pod, e.key);
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </Section>
        <p className="fine">{t('pods.refHint', { ref: `{{pod:${pod.name}/KEY}}` })}</p>

        {hasProvider && (
          <Section>
            <Row icon={<Sparkles size={18} />} title={t('pods.askAboutPod')} onClick={() => askAi(t('pods.askAboutPrompt', { name: pod.name }))} chevron />
          </Section>
        )}

        <Section>
          <Row
            danger
            icon={<Trash2 size={18} />}
            title={t('pods.delete')}
            onClick={async () => {
              if (await confirmDialog({ title: t('pods.deleteConfirm', { name: pod.name }), danger: true, confirmLabel: t('common.delete') })) {
                deletePod(pod.id);
                navigate('/pods', true);
              }
            }}
          />
        </Section>
      </Screen>
      {editing && <EntrySheet key={editing.entry?.key ?? 'new'} pod={pod} entry={editing.entry} open onClose={() => setEditing(null)} />}
    </>
  );
}
