import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Camera, Search, Star, X } from 'lucide-react';
import { searchProducts } from '../../api/openFoodFacts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { FoodProduct, MealEntry, MealType, ServingUnit } from '../../types';
import { useFavoritesStore } from '../../state/useFavoritesStore';
import { useLogsStore } from '../../state/useLogsStore';
import { useProductsStore } from '../../state/useProductsStore';
import ProductDetailSheet from '../ProductDetailSheet';
import BarcodeScanner from '../BarcodeScanner';

export type AddFoodModalProps = {
  open: boolean;
  onClose: () => void;
  initialEntry?: MealEntry | null;
};

const MIN_QUERY = 2;

export default function AddFoodModal({ open, onClose, initialEntry }: AddFoodModalProps) {
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<FoodProduct | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const debounced = useDebouncedValue(query, 250);
  const trimmed = debounced.trim();

  const favoriteItems = useFavoritesStore((state) => state.items);
  const favoriteOrder = useFavoritesStore((state) => state.order);
  const addFavorite = useFavoritesStore((state) => state.addFavorite);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);

  const favorites = useMemo(
    () =>
      favoriteOrder
        .map((id) => favoriteItems[id])
        .filter((product): product is typeof favoriteItems[string] => Boolean(product)),
    [favoriteItems, favoriteOrder],
  );

  const addProductToCache = useProductsStore((state) => state.addProduct);
  const productMap = useProductsStore((state) => state.products);
  const upsertEntry = useLogsStore((state) => state.upsertEntry);

  const {
    data: results = [],
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['add-modal-search', trimmed] as const,
    queryFn: ({ signal }) => searchProducts(trimmed, { signal }),
    enabled: trimmed.length >= MIN_QUERY,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const hasResults = results.length > 0;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedProduct(null);
      setShowScanner(false);
    }
    console.debug('[AddFoodModal] modal', open ? 'opened' : 'closed');
  }, [open]);

  const editingProduct = useMemo(() => {
    if (!initialEntry) return undefined;
    return productMap[initialEntry.productId] ?? favoriteItems[initialEntry.productId];
  }, [initialEntry, productMap, favoriteItems]);

  useEffect(() => {
    if (!open || !initialEntry || !editingProduct) return;
    setSelectedProduct((current) => (current && current.id === editingProduct.id ? current : editingProduct));
    setQuery((current) => (current ? current : editingProduct.name));
  }, [open, initialEntry, editingProduct]);

  useEffect(() => {
    if (!open || !trimmed) return;
    console.debug('[AddFoodModal] searching for', trimmed, 'fetching', isFetching, 'results', results.length);
    if (error) {
      console.error('[AddFoodModal] search error', error);
    }
  }, [open, trimmed, isFetching, results, error]);

  const handleProductSelect = (product: FoodProduct) => {
    const latest = productMap[product.id] ?? product;
    setShowScanner(false);
    setSelectedProduct({ ...latest });
    addProductToCache(latest);
  };

  const handleAddComplete = ({
    product,
    meal,
    portion,
    entryId,
  }: {
    product: FoodProduct;
    meal: MealType;
    portion: { value: number; unit: ServingUnit };
    entryId?: string;
  }) => {
    upsertEntry({
      id: entryId ?? initialEntry?.id,
      productId: product.id,
      meal,
      portion,
      perServing: product.perServing,
      productServing: product.servingSize,
    });
    addProductToCache(product);
    setSelectedProduct(null);
    onClose();
  };

  const toggleFavorite = (product: FoodProduct) => {
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const containerClasses = [
    'flex flex-col gap-4',
    showScanner ? 'lg:grid lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] lg:gap-6 lg:items-start' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scannerPanel = showScanner ? (
    <div
      className={[
        'order-2 rounded-3xl border border-dashed border-white/10 bg-surface p-3 transition',
        'lg:order-none lg:col-start-2 lg:row-span-2 lg:sticky lg:top-0',
      ].join(' ')}
    >
      <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
        <BarcodeScanner
          onComplete={() => {
            setShowScanner(false);
            onClose();
          }}
        />
      </div>
      <p className="mt-3 text-center text-xs text-muted">Tip: hold steady and fill the frame for best results.</p>
    </div>
  ) : null;

  return (
    <>
      <div className={containerClasses}>
        <div className="order-1 flex flex-col gap-4 lg:order-none lg:col-start-1">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Quick Add</p>
              <h1 className="text-xl font-semibold text-foreground">Find and log food</h1>
              <p className="text-sm text-muted">
                Type to search Open Food Facts, or tap a favorite for instant access.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close add modal"
              className="rounded-full border border-white/10 p-2 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search foods..."
              className="w-full rounded-2xl border border-white/10 bg-surface pl-11 pr-4 py-3 text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowScanner((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <Camera className="h-4 w-4" /> {showScanner ? 'Hide scanner' : 'Scan barcode'}
            </button>
            {showScanner && <p className="text-[11px] text-muted">Point at barcode to fetch instantly</p>}
          </div>
        </div>

        {scannerPanel}

        <div className="order-3 flex flex-col gap-4 lg:order-none lg:col-start-1">
          {favorites.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
                <p className="text-xs text-muted">Tap to add quickly</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {favorites.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
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
                      <Star className="h-4 w-4 fill-brand text-brand" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Search results</h2>
              {isFetching && <p className="text-xs text-muted">Loading…</p>}
            </div>
            {isError && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                Couldn&apos;t load search results. Please try again.
              </p>
            )}
            {!trimmed && !showScanner && !isFetching && (
              <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
                Start typing to search Open Food Facts.
              </p>
            )}
            {trimmed && !hasResults && !isFetching && !isError && (
              <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
                No matches found. Try a different keyword.
              </p>
            )}
            {hasResults && (
              <ul className="space-y-2">
                {results.map((product) => {
                  const favorite = isFavorite(product.id);
                  return (
                    <li
                      key={product.id}
                      className="rounded-2xl border border-white/10 bg-surface p-3 shadow-sm transition hover:border-brand/40"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-surfaceMuted" aria-hidden="true" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                            {product.brand && <p className="text-xs text-muted line-clamp-1">{product.brand}</p>}
                            <p className="text-xs text-muted">{Math.round(product.perServing.calories)} kcal</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product)}
                          className={`rounded-full border border-white/10 p-2 transition ${favorite ? 'bg-brand/10 text-brand' : 'text-muted hover:text-foreground'}`}
                          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ProductDetailSheet
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onConfirm={({ product, meal, portion, entryId }) =>
          handleAddComplete({ product, meal, portion, entryId })
        }
        initialMeal={initialEntry?.meal}
        initialPortion={initialEntry?.portion}
        entryId={initialEntry?.id}
      />
    </>
  );
}
