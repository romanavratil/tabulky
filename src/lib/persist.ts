import localforage from 'localforage';
import type { DayLog, FoodProduct, Settings } from '../types';

export const storage = localforage.createInstance({
  name: 'kt-calorie-tracker',
  storeName: 'app',
  description: 'Calorie tracker offline data',
});

const KEYS = {
  version: 'app:version',
  logs: 'dayLogs',
  customProducts: 'customProducts',
  settings: 'settings',
} as const;

const STORAGE_VERSION = 3;

export const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

type PersistedSettingsContainer = {
  state?: {
    settings?: Settings;
  } | null;
  version?: number;
};

function normalizeSettings(settings: Partial<Settings> | null | undefined): Settings {
  const fallback = defaultSettings();
  if (!settings) {
    return fallback;
  }
  return {
    ...fallback,
    ...settings,
    meals: settings.meals && settings.meals.length ? settings.meals : fallback.meals,
    dailyTargets: {
      ...fallback.dailyTargets,
      ...(settings.dailyTargets ?? {}),
    },
    favoriteProductIds: settings.favoriteProductIds ?? [],
  };
}

function extractSettings(value: unknown): Settings | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return extractSettings(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object') {
    return null;
  }
  if ('state' in (value as Record<string, unknown>)) {
    const container = value as PersistedSettingsContainer;
    if (container.state && typeof container.state === 'object' && 'settings' in container.state) {
      const candidate = container.state.settings;
      if (candidate && typeof candidate === 'object') {
        return normalizeSettings(candidate);
      }
    }
  }
  if ('units' in (value as Record<string, unknown>)) {
    return normalizeSettings(value as Partial<Settings>);
  }
  return null;
}

function serializeSettings(settings: Settings): string {
  return JSON.stringify({
    state: {
      settings,
    },
    version: 0,
  });
}

export async function ensureStorage() {
  const version = await storage.getItem<number>(KEYS.version);
  if (version !== STORAGE_VERSION) {
    await migrate(version ?? 0);
    await storage.setItem(KEYS.version, STORAGE_VERSION);
  }
}

async function migrate(previous: number) {
  if (previous < 1) {
    await storage.setItem(KEYS.logs, {});
    await storage.setItem(KEYS.customProducts, {});
    await saveSettings(defaultSettings());
  }

  if (previous < 2) {
    const current = await loadSettings();
    await saveSettings({
      ...current,
      meals: current.meals.length ? current.meals : DEFAULT_MEALS,
    });
  }

  if (previous < 3) {
    const current = await loadSettings();
    await saveSettings(current);
  }
}

export function defaultSettings(): Settings {
  return {
    units: 'metric',
    defaultServingUnit: 'g',
    dailyTargets: {
      calories: 2100,
      protein: 140,
      carbs: 220,
      fat: 70,
    },
    theme: 'system',
    meals: DEFAULT_MEALS,
    favoriteProductIds: [],
  };
}

export async function loadDayLogs(): Promise<Record<string, DayLog>> {
  const data = await storage.getItem<Record<string, DayLog>>(KEYS.logs);
  return data ?? {};
}

export async function saveDayLogs(logs: Record<string, DayLog>) {
  await storage.setItem(KEYS.logs, logs);
}

export async function loadCustomProducts(): Promise<Record<string, FoodProduct>> {
  const data = await storage.getItem<Record<string, FoodProduct>>(KEYS.customProducts);
  return data ?? {};
}

export async function saveCustomProducts(records: Record<string, FoodProduct>) {
  await storage.setItem(KEYS.customProducts, records);
}

export async function loadSettings(): Promise<Settings> {
  const raw = await storage.getItem(KEYS.settings);
  const parsed = extractSettings(raw);
  return parsed ?? defaultSettings();
}

export async function saveSettings(settings: Settings) {
  const normalized = normalizeSettings(settings);
  await storage.setItem(KEYS.settings, serializeSettings(normalized));
}

export async function exportData(): Promise<string> {
  const [logs, customProducts, settings] = await Promise.all([
    loadDayLogs(),
    loadCustomProducts(),
    loadSettings(),
  ]);
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      logs,
      customProducts,
      settings,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export async function importData(payload: string) {
  const parsed = JSON.parse(payload);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid data');
  }
  const { logs, customProducts, settings } = parsed;
  await Promise.all([
    saveDayLogs(logs ?? {}),
    saveCustomProducts(customProducts ?? {}),
    saveSettings(settings ?? defaultSettings()),
  ]);
}
