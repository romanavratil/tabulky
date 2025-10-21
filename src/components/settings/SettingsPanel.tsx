import { useState } from 'react';
import { downloadAsFile } from '../../lib/download';
import { exportData, importData } from '../../lib/persist';
import { useSettingsStore } from '../../state/useSettingsStore';

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

const UNITS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
] as const;

export default function SettingsPanel() {
  const { settings, setTheme, updateTargets, updateSettings } = useSettingsStore();
  const [importing, setImporting] = useState(false);

  const handleTargetsChange = (key: 'calories' | 'protein' | 'carbs' | 'fat', value: number) => {
    updateTargets({ [key]: value });
  };

  const handleExport = async () => {
    const payload = await exportData();
    downloadAsFile(`kt-backup-${new Date().toISOString()}.json`, payload);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      await importData(text);
    } catch (error) {
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Theme</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {THEMES.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={settings.theme === option.value}
                onChange={() => setTheme(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Units</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {UNITS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm">
              <input
                type="radio"
                name="units"
                value={option.value}
                checked={settings.units === option.value}
                onChange={() => updateSettings({ units: option.value })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Daily targets</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-wide text-muted" htmlFor={key}>
                {key}
              </label>
              <input
                id={key}
                type="number"
                min={0}
                value={settings.dailyTargets[key]}
                onChange={(event) => handleTargetsChange(key, Number(event.target.value))}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-surface p-4 shadow-soft space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Data</h2>
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-full border border-white/10 px-4 py-2 text-sm"
        >
          Export JSON backup
        </button>
        <label className="block w-full">
          <span className="text-sm text-muted">Import backup</span>
          <input
            type="file"
            accept="application/json"
            className="mt-2 w-full rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
            }}
            disabled={importing}
          />
        </label>
      </section>
    </div>
  );
}
