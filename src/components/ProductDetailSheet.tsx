import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { FoodProduct, MealType, ServingUnit } from '../types';
import Sheet from './ui/Sheet';
import { computeEntryNutrients } from '../lib/nutrition';
import { useSettingsStore } from '../state/useSettingsStore';
import { DEFAULT_MEALS } from '../lib/persist';
import { useFavoritesStore } from '../state/useFavoritesStore';

interface Props {
  product: FoodProduct | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    meal: MealType;
    portion: { value: number; unit: ServingUnit };
    product: FoodProduct;
    entryId?: string;
  }) => void;
  initialMeal?: MealType;
  initialPortion?: { value: number; unit: ServingUnit };
  entryId?: string;
}

export default function ProductDetailSheet({
  product,
  open,
  onClose,
  onConfirm,
  initialMeal,
  initialPortion,
  entryId,
}: Props) {
  const meals = useSettingsStore((state) =>
    state.settings.meals && state.settings.meals.length > 0 ? state.settings.meals : DEFAULT_MEALS,
  );
  const addFavorite = useFavoritesStore((state) => state.addFavorite);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);
  const [meal, setMeal] = useState<MealType>(initialMeal ?? meals[0] ?? 'Meal');
  const [portionValue, setPortionValue] = useState<number>(
    initialPortion?.value ?? product?.servingSize.value ?? 100,
  );
  const [unit, setUnit] = useState<ServingUnit>(
    initialPortion?.unit ?? product?.servingSize.unit ?? 'g',
  );

  const initialPortionValue = initialPortion?.value;
  const initialPortionUnit = initialPortion?.unit;

  useEffect(() => {
    if (!product) return;
    setPortionValue(initialPortionValue ?? product.servingSize.value);
    setUnit(initialPortionUnit ?? product.servingSize.unit);
  }, [product, initialPortionValue, initialPortionUnit]);

  useEffect(() => {
    if (meals.length === 0) return;
    if (initialMeal && meals.includes(initialMeal)) {
      setMeal(initialMeal);
      return;
    }
    setMeal((current) => (meals.includes(current) ? current : meals[0]));
  }, [meals, initialMeal]);

  const nutrients = useMemo(() => {
    if (!product) return null;
    const portion = { value: portionValue, unit };
    return computeEntryNutrients(product.perServing, product.servingSize, portion);
  }, [product, portionValue, unit]);

  const favorite = product ? isFavorite(product.id) : false;
  const actionLabel = entryId ? 'Save changes' : `Add to ${meal}`;

  const formatMacro = (value: number | string | undefined) => {
    if (typeof value === 'number') return value.toFixed(1);
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
    }
    return '0.0';
  };

  const toggleFavorite = () => {
    if (!product) return;
    if (favorite) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const quickServing = (factor: number) => {
    if (!product) return;
    setPortionValue(Number((product.servingSize.value * factor).toFixed(1)));
    setUnit(product.servingSize.unit);
  };

  return (
    <Sheet open={open} onClose={onClose} title={product?.name}>
      {!product ? null : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-surfaceMuted" aria-hidden="true" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground break-words">{product.name}</p>
              {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
              <p className="text-xs text-muted">
                {product.servingSize.value} {product.servingSize.unit} · {Math.round(product.perServing.calories)} kcal
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`rounded-full border border-white/10 p-2 transition ${favorite ? 'bg-brand/10 text-brand' : 'text-muted hover:text-brand'}`}
            >
              <Star className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} strokeWidth={1.75} />
            </button>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Portion</p>
              <p className="text-xs text-muted">
                Default&nbsp;
                <span className="font-medium text-foreground">
                  {product.servingSize.value} {product.servingSize.unit}
                </span>
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-surface px-4 py-3 shadow-soft">
              <div className="space-y-1">
                <label htmlFor="portion-value" className="text-xs uppercase tracking-wide text-muted">
                  Amount
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-background px-3 py-2">
                  <input
                    id="portion-value"
                    type="number"
                    min={0}
                    step="0.1"
                    value={portionValue}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setPortionValue(Number.isNaN(next) ? product.servingSize.value : next);
                    }}
                    className="w-full bg-transparent text-base font-semibold text-foreground outline-none"
                    aria-label="Portion amount"
                  />
                  <span className="text-xs text-muted">{unit}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted">Unit</span>
                <div className="flex rounded-full border border-white/10 bg-background p-1">
                  {(['g', 'ml', 'piece'] as ServingUnit[]).map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => setUnit(candidate)}
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        unit === candidate
                          ? 'bg-brand text-white shadow-soft'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {[0.5, 1, 2].map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => quickServing(factor)}
                  className="flex-1 rounded-full border border-white/10 px-3 py-2 text-xs text-muted hover:text-foreground"
                >
                  {factor === 0.5 ? '½ serving' : `${factor}×`}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">Nutrients</p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {nutrients && (
                <>
                  <li className="rounded-2xl bg-surfaceMuted p-3">
                    <p className="text-xs text-muted">Calories</p>
                    <p className="text-lg font-semibold text-foreground">{Math.round(nutrients.calories)} kcal</p>
                  </li>
                  <li className="rounded-2xl bg-surfaceMuted p-3">
                    <p className="text-xs text-muted">Protein</p>
                    <p className="text-lg font-semibold text-foreground">{formatMacro(nutrients.protein)} g</p>
                  </li>
                  <li className="rounded-2xl bg-surfaceMuted p-3">
                    <p className="text-xs text-muted">Carbs</p>
                    <p className="text-lg font-semibold text-foreground">{formatMacro(nutrients.carbs)} g</p>
                  </li>
                  <li className="rounded-2xl bg-surfaceMuted p-3">
                    <p className="text-xs text-muted">Fat</p>
                    <p className="text-lg font-semibold text-foreground">{formatMacro(nutrients.fat)} g</p>
                  </li>
                </>
              )}
            </ul>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-foreground">Add to meal</p>
            <div className="grid grid-cols-2 gap-2">
              {meals.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMeal(option)}
                  className={[
                    'rounded-2xl border px-3 py-2 text-sm capitalize',
                    meal === option
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-white/10 text-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                onConfirm({ meal, portion: { value: portionValue, unit }, product, entryId })
              }
              className="w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              {actionLabel}
            </button>
          </section>
        </div>
      )}
    </Sheet>
  );
}
