import InsightsCharts from '../components/insights/InsightsCharts';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-muted">Understand your habits and stay on track.</p>
      </header>
      <InsightsCharts />
    </div>
  );
}
