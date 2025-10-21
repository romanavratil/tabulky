import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../../api/openFoodFacts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import ProductCard from '../ProductCard';
import ProductDetailSheet from '../ProductDetailSheet';
import type { FoodProduct, MealType, ServingUnit } from '../../types';
import { useLogsStore } from '../../state/useLogsStore';
import { useProductsStore } from '../../state/useProductsStore';
import { useFavoritesStore } from '../../state/useFavoritesStore';

type SearchPanelProps = {
  onComplete?: () => void;
};

export default function SearchPanel({ onComplete }: SearchPanelProps = {}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const debounced = useDebouncedValue(query, 400);
  const navigate = useNavigate();
  const upsertEntry = useLogsStore((state) => state.upsertEntry);
  const addProduct = useProductsStore((state) => state.addProduct);
  const favoritesState = useFavoritesStore((state) => ({ items: state.items, order: state.order }));

  const trimmedQuery = debounced.trim();
  const favorites = useMemo(
    () =>
      favoritesState.order
        .map((id) => favoritesState.items[id])
        .filter((product): product is typeof favoritesState.items[string] => Boolean(product)),
    [favoritesState],
  );

  const {
    data: results = [],
    isFetching,
    isError,
    isSuccess,
  } = useQuery({
    queryKey: ['search', trimmedQuery] as const,
    queryFn: ({ signal }) => searchProducts(trimmedQuery, { signal }),
    enabled: trimmedQuery.length >= 2,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const hasResults = results.length > 0;

  const handleConfirm = ({
    product,
    meal,
    portion,
  }: {
    product: FoodProduct;
    meal: MealType;
    portion: { value: number; unit: ServingUnit };
  }) => {
    upsertEntry({
      productId: product.id,
      meal,
      portion,
      perServing: product.perServing,
      productServing: product.servingSize,
    });
    addProduct(product);
    setSelected(null);
    navigate('/');
    onComplete?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-surface p-4 shadow-soft">
        <label className="block text-sm font-medium text-muted" htmlFor="search-field">
          Search foods
        </label>
        <input
          id="search-field"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chicken, banana, oatmeal…"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
        />
      </div>

      {favorites.length > 0 && (
        <section className="space-y-3 rounded-3xl bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
            <p className="text-xs text-muted">Tap to add quickly</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {favorites.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelected(product)}
                className="min-w-[200px] flex-1 rounded-2xl border border-white/10 bg-surfaceMuted px-3 py-2 text-left shadow-sm transition hover:border-brand/40"
              >
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-surface" aria-hidden="true" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                    {product.brand && <p className="text-xs text-muted line-clamp-1">{product.brand}</p>}
                    <p className="text-xs text-muted">{Math.round(product.perServing.calories)} kcal</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {isError && (
        <p className="rounded-3xl bg-red-50 p-4 text-sm text-red-700">
          Something went wrong while searching. Please try again.
        </p>
      )}

      <div className="space-y-3">
        {isFetching && (
          <div className="rounded-3xl bg-surface p-4 shadow-soft">
            <p className="text-sm text-muted">Searching…</p>
          </div>
        )}

        {!trimmedQuery && !isFetching && (
          <p className="text-sm text-muted">Start typing to discover products from Open Food Facts.</p>
        )}

        {hasResults && (
          <ul className="space-y-3">
            {results?.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        )}

        {trimmedQuery && isSuccess && !hasResults && !isFetching && !isError && (
          <p className="rounded-3xl bg-surface p-4 text-sm text-muted">
            No matches found. Try a different term or add a custom ingredient.
          </p>
        )}
      </div>

      <ProductDetailSheet
        product={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onConfirm={({ meal, portion, product }) => handleConfirm({ product, meal, portion })}
      />
    </div>
  );
}
