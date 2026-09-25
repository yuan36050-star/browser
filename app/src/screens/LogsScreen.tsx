import { Copy, Download, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cx, Empty, IconButton, Screen, ScreenBar, Spinner, Switch } from '../components/ui';
import { useT } from '../i18n';
import { clearStore, getLogs } from '../lib/db';
import { confirmDialog } from '../lib/dialog';
import { onLog } from '../lib/logger';
import { navigate } from '../lib/router';
import { toast } from '../lib/store';
import type { LogCategory, LogEntry } from '../lib/types';
import { copyText, downloadFile, formatTime, safeJson, today } from '../lib/util';

const CATS: (LogCategory | 'all')[] = ['all', 'request', 'tool', 'mcp', 'app', 'ai'];

export function LogsScreen() {
  const t = useT();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [cat, setCat] = useState<LogCategory | 'all'>('all');
  const [problems, setProblems] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);

  useEffect(() => {
    void getLogs(5000).then(setLogs);
    return onLog((e) => setLogs((prev) => (prev ? [e, ...prev] : prev)));
  }, []);

  const filtered = useMemo(() => {
    if (!logs) return [];
    const ql = q.toLowerCase();
    return logs.filter(
      (l) =>
        (cat === 'all' || l.category === cat) &&
        (!problems || l.level === 'warn' || l.level === 'error') &&
        (!ql || l.message.toLowerCase().includes(ql) || (l.data !== undefined && safeJson(l.data, 0).toLowerCase().includes(ql))),
    );
  }, [logs, cat, problems, q]);

  return (
    <>
      <ScreenBar
        title={t('nav.logs')}
        right={
          <>
            <IconButton label={t('logs.export')} onClick={() => downloadFile(`cove-logs-${today()}.json`, JSON.stringify(filtered, null, 2))}>
              <Download size={19} />
            </IconButton>
            <IconButton
              label={t('logs.clear')}
              onClick={async () => {
                if (await confirmDialog({ title: t('logs.clearConfirm'), danger: true, confirmLabel: t('logs.clear') })) {
                  await clearStore('logs');
                  setLogs([]);
                }
              }}
            >
              <Trash2 size={19} />
            </IconButton>
          </>
        }
      />
      <div className="logs-filters">
        <div className="chip-row scroll-x">
          {CATS.map((c) => (
            <button key={c} className={cx('filter-chip', cat === c && 'on')} onClick={() => setCat(c)}>
              {t(`logs.cat.${c}` as never)}
            </button>
          ))}
        </div>
        <div className="logs-filter-row">
          <div className="search-box">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('logs.search')} autoCapitalize="off" />
          </div>
          <label className="inline-switch">
            <Switch checked={problems} onChange={setProblems} label={t('logs.problems')} />
            <span>{t('logs.problems')}</span>
          </label>
        </div>
      </div>
      <Screen>
        {!logs ? (
          <div className="center pad">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <Empty title={t('logs.empty')} text={t('logs.emptyText')} />
        ) : (
          <div className="log-list">
            {filtered.slice(0, limit).map((l) => (
              <div key={l.id} className={cx('log', `log-${l.level}`, open === l.id && 'open')}>
                <button className="log-head" onClick={() => setOpen(open === l.id ? null : l.id)}>
                  <span className="log-dot" />
                  <span className="log-time">{formatTime(l.ts, !isToday(l.ts))}</span>
                  <span className={cx('log-cat', `cat-${l.category}`)}>{t(`logs.cat.${l.category}` as never)}</span>
                  <span className="log-msg">{l.message}</span>
                </button>
                {open === l.id && (
                  <div className="log-body">
                    {l.data !== undefined && <pre>{safeJson(l.data)}</pre>}
                    <div className="inline-actions">
                      <IconButton label={t('common.copy')} onClick={() => void copyText(safeJson(l)).then(() => toast(t('common.copied'), 'success'))}>
                        <Copy size={15} />
                      </IconButton>
                      {l.convId && (
                        <button className="link" onClick={() => navigate(`/c/${l.convId}`)}>
                          {t('logs.openChat')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length > limit && (
              <button className="load-more" onClick={() => setLimit(limit + 300)}>
                {t('logs.more', { n: filtered.length - limit })}
              </button>
            )}
          </div>
        )}
      </Screen>
    </>
  );
}

function isToday(ts: number) {
  return new Date(ts).toDateString() === new Date().toDateString();
}
