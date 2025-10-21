import type { Nutrients } from '../types';

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

type MacroConfig = {
  key: MacroKey;
  label: string;
  unit: string;
  accent: string;
};

const MACROS: MacroConfig[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', accent: 'from-brand' },
  { key: 'protein', label: 'Protein', unit: 'g', accent: 'from-emerald-500' },
  { key: 'carbs', label: 'Carbs', unit: 'g', accent: 'from-sky-500' },
  { key: 'fat', label: 'Fat', unit: 'g', accent: 'from-amber-500' },
];

const colors: Record<MacroKey, string> = {
  calories: '#7f5fff',
  protein: '#10b981',
  carbs: '#0ea5e9',
  fat: '#f59e0b',
};

type Props = {
  totals: Nutrients;
  targets: Partial<Nutrients>;
};

export default function MacroRings({ totals, targets }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {MACROS.map(({ key, label, unit }) => {
        const current = totals[key] ?? 0;
        const target = targets[key] ?? 0;
        const progress = target > 0 ? Math.min((current / target) * 100, 160) : 0;
        const circumference = 2 * Math.PI * 28;
        const offset = circumference - (progress / 100) * circumference;
        return (
          <div key={key} className="rounded-3xl bg-surface p-3 shadow-soft">
            <div className="flex flex-col items-center gap-2">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  stroke={colors[key]}
                  strokeWidth="8"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 36 36)"
                />
              </svg>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.round(current)} <span className="text-xs text-muted">{unit}</span>
                </p>
                {target > 0 && (
                  <p className="text-xs text-muted">{Math.round(target - current)} {unit} left</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
