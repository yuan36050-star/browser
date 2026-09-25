import { FileText, FolderOpen, MessageSquare, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ModelPicker } from '../components/ModelPicker';
import { Button, Empty, Field, IconButton, Row, Screen, ScreenBar, Section, Switch, TextArea, TextInput } from '../components/ui';
import { useT } from '../i18n';
import { resolveModel, resolveProvider } from '../lib/agent';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { pickFiles, readAttachment } from '../lib/files';
import { navigate } from '../lib/router';
import { deleteProject, toast, upsertProject, useApp } from '../lib/store';
import type { KnowledgeFile, Project } from '../lib/types';
import { errorMessage, formatBytes, now, uid } from '../lib/util';

export function newProject(init: Partial<Project> = {}): Project {
  return {
    id: uid('pj_'),
    name: '',
    emoji: '📁',
    description: '',
    instructions: '',
    files: [],
    createdAt: now(),
    updatedAt: now(),
    ...init,
  };
}

export function ProjectsList() {
  const t = useT();
  const projects = useApp((s) => s.projects);
  const convs = useApp((s) => s.convs);
  const create = () => {
    const p = newProject({ name: t('projects.untitled') });
    upsertProject(p);
    navigate(`/projects/${p.id}`);
  };
  return (
    <>
      <ScreenBar
        title={t('nav.projects')}
        right={
          <IconButton label={t('projects.new')} onClick={create}>
            <Plus size={21} />
          </IconButton>
        }
      />
      <Screen>
        <p className="lead">{t('projects.lead')}</p>
        {projects.length === 0 ? (
          <Empty
            icon={<FolderOpen size={28} />}
            title={t('projects.empty')}
            text={t('projects.emptyText')}
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={create}>
                {t('projects.new')}
              </Button>
            }
          />
        ) : (
          <div className="card-grid">
            {projects.map((p) => {
              const n = convs.filter((c) => c.projectId === p.id).length;
              return (
                <button key={p.id} className="card" onClick={() => navigate(`/projects/${p.id}`)}>
                  <span className="card-emoji">{p.emoji}</span>
                  <span className="card-title">{p.name || t('projects.untitled')}</span>
                  {p.description && <span className="card-text">{p.description}</span>}
                  <span className="card-meta">
                    <MessageSquare size={13} /> {n} · <FileText size={13} /> {p.files.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Screen>
    </>
  );
}

function useAutosave<T>(value: T, save: (v: T) => void, ms = 500) {
  const first = useRef(true);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h = setTimeout(() => save(value), ms);
    return () => clearTimeout(h);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => save(latest.current), []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function ProjectDetail({ id }: { id: string }) {
  const t = useT();
  const stored = useApp((s) => s.projects.find((p) => p.id === id));
  const allConvs = useApp((s) => s.convs);
  const convs = useMemo(() => allConvs.filter((c) => c.projectId === id), [allConvs, id]);
  const connectors = useApp((s) => s.connectors);
  const [draft, setDraft] = useState<Project | null>(() => (stored ? structuredClone(stored) : null));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const deleted = useRef(false);

  useAutosave(draft, (v) => {
    if (v && !deleted.current) upsertProject(v);
  });

  if (!draft) {
    return (
      <>
        <ScreenBar title={t('nav.projects')} back="/projects" />
        <Empty title={t('common.notFound')} />
      </>
    );
  }
  const set = (patch: Partial<Project>) => setDraft({ ...draft, ...patch });
  const provider = resolveProvider({ providerId: draft.providerId });
  const totalSize = draft.files.reduce((n, f) => n + f.size, 0);

  const addFiles = async () => {
    const files = await pickFiles('*/*');
    if (!files.length) return;
    setAdding(true);
    const out: KnowledgeFile[] = [];
    for (const f of files) {
      try {
        const a = await readAttachment(f);
        if (a.kind === 'binary') throw new Error(t('projects.unsupportedFile', { name: a.name }));
        out.push({ id: uid('kf_'), name: a.name, mime: a.mime, size: a.size, text: a.text, data: a.kind === 'text' ? undefined : a.data, addedAt: now() });
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    }
    setAdding(false);
    setDraft((d) => (d ? { ...d, files: [...d.files, ...out] } : d));
  };

  return (
    <>
      <ScreenBar
        title={draft.name || t('projects.untitled')}
        back="/projects"
        right={
          <Button size="sm" variant="primary" icon={<MessageSquare size={15} />} onClick={() => navigate(`/?project=${draft.id}`)}>
            {t('projects.chat')}
          </Button>
        }
      />
      <Screen narrow>
        <div className="project-head">
          <button
            className="emoji-btn"
            onClick={async () => {
              const v = await promptDialog({ title: t('common.emoji'), field: { value: draft.emoji } });
              if (v) set({ emoji: [...v.trim()][0] ?? '📁' });
            }}
          >
            {draft.emoji}
          </button>
          <TextInput className="title-input" value={draft.name} placeholder={t('projects.namePlaceholder')} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <Section>
          <div className="form">
            <Field label={t('projects.description')}>
              <TextInput value={draft.description} placeholder={t('projects.descriptionPlaceholder')} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label={t('projects.instructions')} hint={t('projects.instructionsHint')}>
              <TextArea autoGrow rows={5} value={draft.instructions} placeholder={t('projects.instructionsPlaceholder')} onChange={(e) => set({ instructions: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section
          title={`${t('projects.knowledge')} · ${formatBytes(totalSize)}`}
          footer={t('projects.knowledgeHint')}
          action={
            <Button size="sm" variant="ghost" icon={<Plus size={15} />} loading={adding} onClick={() => void addFiles()}>
              {t('common.add')}
            </Button>
          }
        >
          {draft.files.length === 0 && <Row title={<span className="muted">{t('projects.noFiles')}</span>} />}
          {draft.files.map((f) => (
            <Row
              key={f.id}
              icon={<FileText size={18} />}
              title={f.name}
              subtitle={`${f.mime || 'file'} · ${formatBytes(f.size)}`}
              right={
                <IconButton label={t('common.remove')} onClick={() => set({ files: draft.files.filter((x) => x.id !== f.id) })}>
                  <X size={17} />
                </IconButton>
              }
            />
          ))}
        </Section>

        <Section title={t('projects.defaults')}>
          <Row
            icon={<Sparkles size={18} />}
            title={t('projects.model')}
            subtitle={draft.model ? `${provider?.name ?? '?'} · ${draft.model}` : `${t('projects.inherit')} (${resolveModel(resolveProvider(), {}) || '—'})`}
            onClick={() => setPickerOpen(true)}
            chevron
          />
          <Row
            title={t('projects.customConnectors')}
            subtitle={t('projects.customConnectorsHint')}
            right={<Switch checked={!!draft.connectorIds} onChange={(v) => set({ connectorIds: v ? connectors.filter((c) => c.enabled).map((c) => c.id) : undefined })} />}
          />
          {draft.connectorIds &&
            connectors.map((c) => (
              <Row
                key={c.id}
                title={c.name}
                right={
                  <Switch
                    checked={draft.connectorIds!.includes(c.id)}
                    onChange={(v) => set({ connectorIds: v ? [...draft.connectorIds!, c.id] : draft.connectorIds!.filter((x) => x !== c.id) })}
                  />
                }
              />
            ))}
        </Section>

        <Section title={`${t('projects.chats')} (${convs.length})`}>
          {convs.length === 0 && <Row title={<span className="muted">{t('projects.noChats')}</span>} />}
          {convs.map((c) => (
            <Row key={c.id} icon={<MessageSquare size={17} />} title={c.title || t('chat.untitled')} subtitle={new Date(c.updatedAt).toLocaleString()} onClick={() => navigate(`/c/${c.id}`)} chevron />
          ))}
        </Section>

        <Section>
          <Row
            danger
            icon={<Trash2 size={18} />}
            title={t('projects.delete')}
            onClick={async () => {
              if (await confirmDialog({ title: t('projects.deleteConfirm', { name: draft.name }), message: t('projects.deleteText'), danger: true, confirmLabel: t('common.delete') })) {
                deleted.current = true;
                deleteProject(draft.id);
                navigate('/projects', true);
              }
            }}
          />
        </Section>
      </Screen>
      <ModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        providerId={draft.providerId}
        model={draft.model}
        allowInherit={t('projects.inherit')}
        onPick={(providerId, model) => set({ providerId, model })}
      />
    </>
  );
}
