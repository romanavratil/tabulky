import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MacroTargets, Settings } from '../types';
import { defaultSettings, storage } from '../lib/persist';
import type { StateStorage } from 'zustand/middleware';

type SettingsState = {
  settings: Settings;
  setTheme: (theme: Settings['theme']) => void;
  updateTargets: (partial: Partial<MacroTargets>) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setMeals: (meals: string[]) => void;
};

const localForageStorage: StateStorage = {
  getItem: async (name) => {
    const value = await storage.getItem(name);
    if (value == null) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      const serialized = JSON.stringify(value);
      await storage.setItem(name, serialized);
      return serialized;
    } catch (error) {
      console.warn(`[persist] Failed to normalize value for ${name}`, error);
      return null;
    }
  },
  setItem: async (name, value) => {
    await storage.setItem(name, value);
  },
  removeItem: async (name) => {
    await storage.removeItem(name);
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings(),
      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      updateTargets: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            dailyTargets: { ...state.settings.dailyTargets, ...partial },
          },
        })),
      updateSettings: (partial) =>
        set((state) => {
          const fallbackMeals = state.settings.meals?.length
            ? state.settings.meals
            : defaultSettings().meals;
          const nextMeals = partial.meals && partial.meals.length > 0 ? partial.meals : fallbackMeals;
          return {
            settings: {
              ...state.settings,
              ...partial,
              meals: nextMeals,
            },
          };
        }),
      setMeals: (meals) =>
        set((state) => ({
          settings: {
            ...state.settings,
            meals: meals.length > 0 ? meals : state.settings.meals,
          },
        })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => localForageStorage),
    },
  ),
);
