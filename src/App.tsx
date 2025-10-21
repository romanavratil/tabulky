import { useEffect, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './routes/Layout';
import TodayPage from './routes/Today';
import CustomIngredientPage from './routes/CustomIngredient';
import InsightsPage from './routes/Insights';
import HistoryPage from './routes/History';
import SettingsPage from './routes/Settings';
import { useSettingsStore } from './state/useSettingsStore';
import { useLogsStore } from './state/useLogsStore';
import { useProductsStore } from './state/useProductsStore';
import { useStoreHydration } from './hooks/useStoreHydration';

function useThemeWatcher(hydrated: boolean) {
  const theme = useSettingsStore((state) => state.settings.theme);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const body = document.body;
    if (!body) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const themeVariables = {
      light: {
        '--color-background': '245 246 250',
        '--color-surface': '255 255 255',
        '--color-surface-muted': '244 244 249',
        '--color-foreground': '30 30 42',
        '--color-muted': '113 113 122',
      },
      dark: {
        '--color-background': '18 19 33',
        '--color-surface': '26 27 42',
        '--color-surface-muted': '32 33 48',
        '--color-foreground': '227 229 248',
        '--color-muted': '159 161 183',
      },
    } as const;

    const applyTheme = (target: 'light' | 'dark') => {
      const isDark = target === 'dark';
      root.classList.toggle('dark', isDark);
      root.classList.toggle('theme-dark', isDark);
      body.classList.toggle('dark', isDark);
      body.classList.toggle('theme-dark', isDark);
      root.dataset.theme = target;
      body.dataset.theme = target;
      root.style.colorScheme = target;
      body.style.colorScheme = target;
      const variables = themeVariables[target];
      Object.entries(variables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
        body.style.setProperty(key, value);
      });
    };

    const determineTheme = () => {
      if (theme === 'dark') return 'dark';
      if (theme === 'light') return 'light';
      return media.matches ? 'dark' : 'light';
    };

    applyTheme(determineTheme());

    const listener = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(event.matches ? 'dark' : 'light');
      }
    };

    media.addEventListener('change', listener);

    return () => {
      media.removeEventListener('change', listener);
    };
  }, [theme, hydrated]);
}

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-muted">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
      <p className="text-sm">Preparing your experience…</p>
    </div>
  );
}

export default function App() {
  const settingsHydrated = useStoreHydration(useSettingsStore);
  useThemeWatcher(settingsHydrated);
  const logsHydrated = useStoreHydration(useLogsStore);
  const productsHydrated = useStoreHydration(useProductsStore);

  const hydrated = useMemo(
    () => settingsHydrated && logsHydrated && productsHydrated,
    [settingsHydrated, logsHydrated, productsHydrated],
  );

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayPage />} />
          <Route path="/custom" element={<CustomIngredientPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
