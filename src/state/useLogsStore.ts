import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DayLog, MealEntry, MealType, Nutrients, ServingUnit } from '../types';
import { computeEntryNutrients, computeDayTotals } from '../lib/nutrition';
import { getTodayId } from '../lib/date';
import { storage } from '../lib/persist';
import type { StateStorage } from 'zustand/middleware';

type UpsertPayload = {
  id?: string;
  productId: string;
  meal: MealType;
  portion: MealEntry['portion'];
  perServing: Nutrients;
  productServing: { value: number; unit: ServingUnit };
  createdAt?: string;
};

type LogsState = {
  logs: Record<string, DayLog>;
  currentDate: string;
  setDate: (date: string) => void;
  upsertEntry: (payload: UpsertPayload) => MealEntry;
  removeEntry: (entryId: string) => void;
  moveEntry: (entryId: string, targetMeal: MealType, targetIndex: number) => void;
  setGoal: (date: string, goal: Nutrients) => void;
  clearDay: (date: string) => void;
  renameMeal: (from: string, to: string) => void;
  removeMealEntries: (meal: string) => void;
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

const ensureLog = (logs: Record<string, DayLog>, date: string): DayLog => {
  if (logs[date]) return logs[date];
  const blank: DayLog = {
    date,
    entries: [],
    totals: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      salt: 0,
    },
  };
  logs[date] = blank;
  return blank;
};

export const useLogsStore = create<LogsState>()(
  persist(
    (set) => ({
      logs: {},
      currentDate: getTodayId(),
      setDate: (date) => set({ currentDate: date }),
      upsertEntry: ({ id, meal, productId, portion, perServing, productServing, createdAt }) => {
        const entryId =
          id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2));
        let timestamp = createdAt ?? new Date().toISOString();
        let produced: MealEntry | null = null;
        set((state) => {
          const logs = { ...state.logs };
          const log = ensureLog(logs, state.currentDate);
          const existingIndex = log.entries.findIndex((entry) => entry.id === entryId);
          if (existingIndex >= 0) {
            timestamp = log.entries[existingIndex].createdAt;
          }
          const nutrients = computeEntryNutrients(perServing, productServing, portion);
          const entry: MealEntry = {
            id: entryId,
            meal,
            productId,
            portion,
            nutrients,
            createdAt: timestamp,
          };
          if (existingIndex >= 0) {
            log.entries[existingIndex] = entry;
          } else {
            log.entries.push(entry);
          }
          log.totals = computeDayTotals(log.entries);
          produced = entry;
          return { logs };
        });
        return (
          produced ?? {
            id: entryId,
            meal,
            productId,
            portion,
            nutrients: computeEntryNutrients(perServing, productServing, portion),
            createdAt: timestamp,
          }
        );
      },
      removeEntry: (entryId) =>
        set((state) => {
          const logs = { ...state.logs };
          const log = logs[state.currentDate];
          if (!log) return {};
          log.entries = log.entries.filter((entry) => entry.id !== entryId);
          log.totals = computeDayTotals(log.entries);
          return { logs };
        }),
      moveEntry: (entryId, targetMeal, targetIndex) =>
        set((state) => {
          const logs = { ...state.logs };
          const log = logs[state.currentDate];
          if (!log) return {};
          const fromIndex = log.entries.findIndex((entry) => entry.id === entryId);
          if (fromIndex === -1) return {};
          const [entry] = log.entries.splice(fromIndex, 1);
          const updatedEntry: MealEntry = { ...entry, meal: targetMeal };
          const safeIndex = Math.max(0, targetIndex);
          const mealPositions: number[] = [];
          for (let i = 0; i < log.entries.length; i++) {
            if (log.entries[i].meal === targetMeal) {
              mealPositions.push(i);
            }
          }
          let insertIndex: number;
          if (mealPositions.length === 0) {
            insertIndex = log.entries.length;
          } else if (safeIndex >= mealPositions.length) {
            insertIndex = mealPositions[mealPositions.length - 1] + 1;
          } else {
            insertIndex = mealPositions[safeIndex];
          }
          if (insertIndex > log.entries.length) {
            insertIndex = log.entries.length;
          }
          log.entries.splice(insertIndex, 0, updatedEntry);
          log.totals = computeDayTotals(log.entries);
          return { logs };
        }),
      renameMeal: (from, to) =>
        set((state) => {
          const original = from.trim();
          const next = to.trim();
          if (!original || !next || original === next) return {};
          const logs = { ...state.logs };
          let changed = false;
          Object.values(logs).forEach((log) => {
            let mutated = false;
            log.entries = log.entries.map((entry) => {
              if (entry.meal === original) {
                mutated = true;
                return { ...entry, meal: next };
              }
              return entry;
            });
            if (mutated) {
              log.totals = computeDayTotals(log.entries);
              changed = true;
            }
          });
          return changed ? { logs } : {};
        }),
      removeMealEntries: (meal) =>
        set((state) => {
          const target = meal.trim();
          if (!target) return {};
          const logs = { ...state.logs };
          let changed = false;
          Object.values(logs).forEach((log) => {
            const nextEntries = log.entries.filter((entry) => entry.meal !== target);
            if (nextEntries.length !== log.entries.length) {
              log.entries = nextEntries;
              log.totals = computeDayTotals(log.entries);
              changed = true;
            }
          });
          return changed ? { logs } : {};
        }),
      setGoal: (date, goal) =>
        set((state) => {
          const logs = { ...state.logs };
          const log = ensureLog(logs, date);
          log.goal = goal;
          log.totals = computeDayTotals(log.entries);
          return { logs };
        }),
      clearDay: (date) =>
        set((state) => {
          const logs = { ...state.logs };
          if (logs[date]) {
            logs[date] = {
              ...logs[date],
              entries: [],
              totals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                salt: 0,
              },
            };
          }
          return { logs };
        }),
    }),
    {
      name: 'logs',
      storage: createJSONStorage(() => localForageStorage),
    },
  ),
);
