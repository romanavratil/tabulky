import SettingsPanel from '../components/settings/SettingsPanel';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted">Fine-tune your experience, targets, and appearance.</p>
      </header>
      <SettingsPanel />
    </div>
  );
}
