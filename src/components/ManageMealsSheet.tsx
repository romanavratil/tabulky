import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Sheet from './ui/Sheet';
import { useSettingsStore } from '../state/useSettingsStore';
import { useLogsStore } from '../state/useLogsStore';
import { DEFAULT_MEALS } from '../lib/persist';

type Props = {
  open: boolean;
  onClose: () => void;
};

type MealItem = { id: string; name: string };

const makeId = () => `meal-${Math.random().toString(36).slice(2, 9)}`;

export default function ManageMealsSheet({ open, onClose }: Props) {
  const meals = useSettingsStore((state) =>
    state.settings.meals && state.settings.meals.length > 0 ? state.settings.meals : DEFAULT_MEALS,
  );
  const setMeals = useSettingsStore((state) => state.setMeals);
  const renameMeal = useLogsStore((state) => state.renameMeal);
  const removeMealEntries = useLogsStore((state) => state.removeMealEntries);

  const originalItems = useMemo<MealItem[]>(
    () => meals.map((name) => ({ id: name, name })),
    [meals],
  );
  const [items, setItems] = useState<MealItem[]>(originalItems);

  useEffect(() => {
    if (open) {
      setItems(originalItems);
    }
  }, [open, originalItems]);

  const handleAdd = () => {
    setItems((prev) => [...prev, { id: makeId(), name: `Meal ${prev.length + 1}` }]);
  };

  const handleNameChange = (id: string, name: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSave = () => {
    if (items.length === 0) {
      onClose();
      return;
    }
    const used = new Set<string>();
    const sanitized = items.map((item, index) => {
      let base = item.name.trim();
      if (!base) {
        base = `Meal ${index + 1}`;
      }
      let finalName = base;
      let suffix = 2;
      while (used.has(finalName)) {
        finalName = `${base} (${suffix})`;
        suffix += 1;
      }
      used.add(finalName);
      return { ...item, name: finalName };
    });

    const finalNames = sanitized.map((item) => item.name);
    const existingIds = new Set(originalItems.map((item) => item.id));
    const currentIds = new Set(sanitized.map((item) => item.id));

    // Remove entries for meals that were deleted.
    originalItems.forEach((item) => {
      if (!currentIds.has(item.id)) {
        removeMealEntries(item.id);
      }
    });

    // Rename entries for meals that changed labels.
    sanitized.forEach((item) => {
      if (existingIds.has(item.id) && item.id !== item.name) {
        renameMeal(item.id, item.name);
      }
    });

    setMeals(finalNames);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Organize meals">
      <p className="text-sm text-muted">
        Rename, reorder, or add meal sections. Changes update your existing logs instantly.
      </p>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2">
            <span className="text-xs font-medium text-muted w-6 text-right">{index + 1}.</span>
            <input
              value={item.name}
              onChange={(event) => handleNameChange(item.id, event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm"
              aria-label={`Meal name ${index + 1}`}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                className="rounded-full border border-white/10 p-2 text-muted disabled:opacity-40"
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === items.length - 1}
                className="rounded-full border border-white/10 p-2 text-muted disabled:opacity-40"
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={items.length <= 1}
                className="rounded-full border border-white/10 p-2 text-red-400 disabled:opacity-40"
                aria-label="Remove meal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/10 px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add meal
        </button>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft"
        >
          Save changes
        </button>
      </div>
    </Sheet>
  );
}
