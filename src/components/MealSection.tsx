import type { CSSProperties } from 'react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FoodProduct, MealEntry, MealType } from '../types';
import { useProductsStore } from '../state/useProductsStore';

type Props = {
  meal: MealType;
  entries: MealEntry[];
  onRemove: (entryId: string) => void;
  onAdd?: (meal: MealType) => void;
  onEdit?: (entry: MealEntry) => void;
};

export default function MealSection({ meal, entries, onRemove, onAdd, onEdit }: Props) {
  const products = useProductsStore((state) => state.products);
  const { setNodeRef, isOver } = useDroppable({
    id: meal,
    data: { type: 'meal-container', meal },
  });
  const items = entries.map((entry) => entry.id);

  return (
    <section
      className={[
        'space-y-3 rounded-3xl bg-surface p-4 transition',
        isOver ? 'ring-2 ring-brand/40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{meal}</h2>
          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(meal)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-muted transition hover:text-foreground"
              aria-label={`Add to ${meal}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted">
          {entries.reduce((total, entry) => total + entry.nutrients.calories, 0).toFixed(0)} kcal
        </span>
      </header>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="space-y-3">
          {entries.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-white/10 bg-surfaceMuted/50 p-4 text-center text-sm text-muted">
              Drag items here or add a new one.
            </li>
          ) : (
            entries.map((entry) => (
              <DraggableMealEntry
                key={entry.id}
                entry={entry}
                meal={meal}
                product={products[entry.productId]}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

type EntryProps = {
  entry: MealEntry;
  meal: MealType;
  product?: FoodProduct;
  onEdit?: (entry: MealEntry) => void;
  onRemove: (entryId: string) => void;
};

function DraggableMealEntry({ entry, meal, product, onEdit, onRemove }: EntryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.id,
    data: { type: 'entry', meal, entry },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-start gap-3 rounded-2xl border border-white/10 bg-surfaceMuted/60 p-3',
        isDragging ? 'shadow-lg ring-2 ring-brand/40 bg-surfaceMuted/90' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={`mt-1 flex h-10 w-6 items-center justify-center cursor-grab text-muted transition hover:text-foreground ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {product?.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-xl bg-surface" aria-hidden="true" />
      )}
      <div className="flex flex-1 items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{product?.name ?? 'Unknown item'}</p>
          <p className="text-xs text-muted">
            {entry.portion.value} {entry.portion.unit} · {Math.round(entry.nutrients.calories)} kcal
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-muted transition hover:text-foreground"
              aria-label="Edit entry"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-muted transition hover:text-red-500"
            aria-label="Remove entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
