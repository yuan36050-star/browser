import { Brain, FolderOpen, Globe, Plug, ShieldCheck, Wrench } from 'lucide-react';
import { useT } from '../i18n';
import { navigate } from '../lib/router';
import { patchConnector, updateSettings, upsertProject, useApp } from '../lib/store';
import type { Effort, PermissionMode, Project, Provider } from '../lib/types';
import type { ChatOpts } from './Composer';
import { Button, Row, Section, Segmented, Sheet, StatusDot, Switch } from './ui';

const EFFORTS: Effort[] = ['default', 'low', 'medium', 'high', 'xhigh', 'max'];

export function ChatOptions({
  open,
  onClose,
  opts,
  onOpts,
  provider,
  project,
}: {
  open: boolean;
  onClose: () => void;
  opts: ChatOpts;
  onOpts: (patch: Partial<ChatOpts>) => void;
  provider?: Provider;
  project?: Project;
}) {
  const t = useT();
  const settings = useApp((s) => s.settings);
  const connectors = useApp((s) => s.connectors);
  const projects = useApp((s) => s.projects);
  const mcp = useApp((s) => s.mcp);
  const thinking = opts.thinking ?? settings.defaultThinking;
  const effort = opts.effort ?? settings.defaultEffort;
  const webSearchAvailable = provider?.kind === 'anthropic' && provider.serverTools;

  const connectorOn = (id: string) => (project?.connectorIds ? project.connectorIds.includes(id) : !!connectors.find((c) => c.id === id)?.enabled);
  const toggleConnector = (id: string, on: boolean) => {
    if (project?.connectorIds) {
      const ids = on ? [...project.connectorIds, id] : project.connectorIds.filter((x) => x !== id);
      upsertProject({ ...project, connectorIds: ids });
    } else patchConnector(id, { enabled: on });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('opts.title')}>
      <Section>
        <Row icon={<Brain size={18} />} title={t('opts.thinking')} subtitle={t('opts.thinkingHint')} right={<Switch checked={thinking} onChange={(v) => onOpts({ thinking: v })} />} />
        <div className="row-block">
          <span className="row-block-label">{t('opts.effort')}</span>
          <div className="scroll-x">
            <Segmented size="sm" value={effort} onChange={(v) => onOpts({ effort: v })} options={EFFORTS.map((e) => ({ value: e, label: t(`effort.${e}` as never) }))} />
          </div>
        </div>
        <Row
          icon={<Globe size={18} />}
          title={t('opts.webSearch')}
          subtitle={webSearchAvailable ? t('opts.webSearchHint') : t('opts.webSearchUnavailable')}
          right={<Switch checked={!!opts.webSearch && !!webSearchAvailable} disabled={!webSearchAvailable} onChange={(v) => onOpts({ webSearch: v })} />}
        />
      </Section>

      <Section title={t('opts.permissions')}>
        <div className="row-block">
          <span className="row-block-label">
            <ShieldCheck size={16} /> {t('settings.permissionMode')}
          </span>
          <Segmented<PermissionMode>
            size="sm"
            value={settings.permissionMode}
            onChange={(v) => updateSettings({ permissionMode: v })}
            options={[
              { value: 'ask', label: t('perm.ask') },
              { value: 'auto-read', label: t('perm.autoRead') },
              { value: 'auto', label: t('perm.auto') },
            ]}
          />
        </div>
      </Section>

      <Section
        title={t('nav.connectors')}
        footer={project?.connectorIds ? t('opts.projectConnectors') : undefined}
        action={
          <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate('/connectors'); }}>
            {t('common.manage')}
          </Button>
        }
      >
        {connectors.length === 0 && <Row icon={<Plug size={18} />} title={t('connectors.none')} onClick={() => { onClose(); navigate('/connectors/new'); }} chevron />}
        {connectors.map((c) => (
          <Row
            key={c.id}
            icon={<StatusDot state={mcp[c.id]?.state ?? 'idle'} />}
            title={c.name}
            subtitle={c.mode === 'api' ? t('connectors.modeApi') : `${c.toolCache?.length ?? 0} ${t('connectors.tools')}`}
            right={<Switch checked={connectorOn(c.id)} onChange={(v) => toggleConnector(c.id, v)} />}
          />
        ))}
        <Row icon={<Wrench size={18} />} title={t('opts.builtinTools')} subtitle={t('opts.builtinToolsHint')} onClick={() => { onClose(); navigate('/settings/ai'); }} chevron />
      </Section>

      {projects.length > 0 && (
        <Section title={t('nav.projects')}>
          <div className="row-block">
            <span className="row-block-label">
              <FolderOpen size={16} /> {t('opts.project')}
            </span>
            <select className="input select" value={opts.projectId ?? ''} onChange={(e) => onOpts({ projectId: e.target.value || undefined })}>
              <option value="">{t('opts.noProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </div>
        </Section>
      )}
    </Sheet>
  );
}
