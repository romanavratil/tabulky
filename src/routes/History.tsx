import HistoryTimeline from '../components/history/HistoryTimeline';

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">History</h1>
        <p className="text-sm text-muted">Review past days and make adjustments quickly.</p>
      </header>
      <HistoryTimeline />
    </div>
  );
}
