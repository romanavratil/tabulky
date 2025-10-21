import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, GripVertical, Pencil, Trash2 } from 'lucide-react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import MacroRings from '../components/MacroRings';
import MealSection from '../components/MealSection';
import ManageMealsSheet from '../components/ManageMealsSheet';
import { useLogsStore } from '../state/useLogsStore';
import { useSettingsStore } from '../state/useSettingsStore';
import { formatDayLong, shiftDate } from '../lib/date';
import { DEFAULT_MEALS } from '../lib/persist';
import Sheet from '../components/ui/Sheet';
import AddFoodModal from '../components/add/AddFoodModal';
import type { MealEntry, MealType } from '../types';
import { useProductsStore } from '../state/useProductsStore';

export default function TodayPage() {
  const currentDate = useLogsStore((state) => state.currentDate);
  const setDate = useLogsStore((state) => state.setDate);
  const removeEntry = useLogsStore((state) => state.removeEntry);
  const moveEntry = useLogsStore((state) => state.moveEntry);
  const logs = useLogsStore((state) => state.logs);
  const settings = useSettingsStore((state) => state.settings);
  const products = useProductsStore((state) => state.products);
  const [manageOpen, setManageOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [activeEntry, setActiveEntry] = useState<MealEntry | null>(null);
  const [localMeals, setLocalMeals] = useState<Record<string, MealEntry[]>>({});

  const log = useMemo(() => logs[currentDate], [logs, currentDate]);
  const entries = useMemo(() => [...(logs[currentDate]?.entries ?? [])], [logs, currentDate]);
  const totals = log?.totals ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    salt: 0,
  };

  const macroTargets = settings.dailyTargets;
  const baseMeals = settings.meals && settings.meals.length > 0 ? settings.meals : DEFAULT_MEALS;
  const displayMeals = useMemo(() => {
    const names = new Set<string>(baseMeals);
    entries.forEach((entry) => names.add(entry.meal));
    return Array.from(names);
  }, [baseMeals, entries]);

  useEffect(() => {
    const map: Record<string, MealEntry[]> = {};
    displayMeals.forEach((name) => {
      map[name] = entries.filter((entry) => entry.meal === name);
    });
    setLocalMeals(map);
  }, [displayMeals, entries]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as MealEntry | undefined;
    if (entry) {
      setActiveEntry(entry);
    }
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveEntry(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    const { active, over } = event;
    if (!over) return;
    const sourceMeal = (active.data.current?.meal as MealType | undefined) ?? null;
    if (!sourceMeal) return;
    let targetMeal =
      (over.data.current?.meal as MealType | undefined) ??
      (typeof over.id === 'string' ? (over.id as MealType) : null);
    if (!targetMeal) return;

    const activeId = active.id as string;
    const sourceList = localMeals[sourceMeal] ?? [];
    const sourceIndex = sourceList.findIndex((entry) => entry.id === activeId);
    if (sourceIndex === -1) return;

    let targetIndex = 0;
    if (over.data.current?.type === 'entry') {
      const targetList = localMeals[targetMeal] ?? [];
      targetIndex = targetList.findIndex((entry) => entry.id === over.id);
      if (targetIndex === -1) {
        targetIndex = targetList.length;
      }
    } else {
      targetIndex = (localMeals[targetMeal] ?? []).length;
    }

    if (targetMeal === sourceMeal) {
      if (targetIndex > sourceIndex) {
        targetIndex -= 1;
      }
      if (targetIndex === sourceIndex) return;
    }

    setLocalMeals((prev) => {
      const map: Record<string, MealEntry[]> = {};
      displayMeals.forEach((name) => {
        map[name] = prev[name] ? [...prev[name]] : [];
      });
      const source = map[sourceMeal] ?? [];
      const removed = source.splice(sourceIndex, 1)[0];
      map[sourceMeal] = source;
      const target = map[targetMeal] ?? [];
      const insertIndex = Math.min(Math.max(targetIndex, 0), target.length);
      target.splice(insertIndex, 0, { ...removed, meal: targetMeal });
      map[targetMeal] = target;
      return map;
    });

    moveEntry(activeId, targetMeal, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background/95 pb-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setDate(shiftDate(currentDate, -1))}
            className="rounded-full border border-white/10 p-2 text-muted hover:text-foreground"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted">Daily Log</p>
            <h1 className="text-xl font-semibold text-foreground">{formatDayLong(currentDate)}</h1>
          </div>
          <button
            type="button"
            onClick={() => setDate(shiftDate(currentDate, 1))}
            className="rounded-full border border-white/10 p-2 text-muted hover:text-foreground"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" /> Manage meals
          </button>
        </div>


        <MacroRings totals={totals} targets={macroTargets} />

        <div className="space-y-4">
          {displayMeals.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={localMeals[meal] ?? []}
              onRemove={removeEntry}
              onAdd={
                baseMeals.includes(meal)
                  ? () => {
                      setEditingEntry(null);
                      setQuickAddOpen(true);
                    }
                  : undefined
              }
              onEdit={(entry) => {
                setEditingEntry(entry);
                setQuickAddOpen(true);
              }}
            />
          ))}
        </div>

        <ManageMealsSheet open={manageOpen} onClose={() => setManageOpen(false)} />

        <Sheet
          open={quickAddOpen}
          onClose={() => {
            setQuickAddOpen(false);
            setEditingEntry(null);
          }}
          title="Quick add"
        >
          <AddFoodModal
            open={quickAddOpen}
            onClose={() => {
              setQuickAddOpen(false);
              setEditingEntry(null);
            }}
            initialEntry={editingEntry ?? undefined}
          />
        </Sheet>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeEntry ? (
          <DragPreview entry={activeEntry} productName={products[activeEntry.productId]?.name} calories={Math.round(activeEntry.nutrients.calories)} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type DragPreviewProps = {
  entry: MealEntry;
  productName?: string;
  calories: number;
};

function DragPreview({ entry, productName, calories }: DragPreviewProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surfaceMuted/80 p-3 shadow-lg ring-2 ring-brand/40">
      <div className="flex h-10 w-6 items-center justify-center text-muted">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{productName ?? 'Unknown item'}</p>
          <p className="text-xs text-muted">
            {entry.portion.value} {entry.portion.unit} · {calories} kcal
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Pencil className="h-3.5 w-3.5" />
          <Trash2 className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
