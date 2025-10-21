import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogsStore } from '../../state/useLogsStore';
import { formatDayLong } from '../../lib/date';

export default function HistoryTimeline() {
  const logs = useLogsStore((state) => state.logs);
  const setDate = useLogsStore((state) => state.setDate);

  const navigate = useNavigate();

  const items = useMemo(
    () =>
      Object.values(logs)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [logs],
  );

  if (items.length === 0) {
    return <p className="rounded-3xl bg-surface p-4 text-sm text-muted">Log meals to build up your history.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((log) => (
        <li key={log.date}>
          <button
            type="button"
            onClick={() => {
              setDate(log.date);
              navigate('/');
            }}
            className="w-full rounded-3xl bg-surface px-4 py-3 text-left shadow-soft transition hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{formatDayLong(log.date)}</p>
                <p className="text-xs text-muted">{log.entries.length} entries</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{Math.round(log.totals.calories)} kcal</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
