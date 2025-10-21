import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { estimateIngredientsFromPhoto } from '../../api/photoEstimator';
import { searchProducts } from '../../api/openFoodFacts';
import type { EstimatedIngredient, FoodProduct, MealType, ServingUnit } from '../../types';
import ProductDetailSheet from '../ProductDetailSheet';
import { useLogsStore } from '../../state/useLogsStore';
import { useProductsStore } from '../../state/useProductsStore';

type PhotoEstimatorProps = {
  onComplete?: () => void;
};

export default function PhotoEstimator({ onComplete }: PhotoEstimatorProps = {}) {
  const [estimates, setEstimates] = useState<EstimatedIngredient[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FoodProduct | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const upsertEntry = useLogsStore((state) => state.upsertEntry);
  const addProduct = useProductsStore((state) => state.addProduct);

  const detectMutation = useMutation({
    mutationFn: async (file: File) => estimateIngredientsFromPhoto(file),
    onMutate: () => {
      setStatusMessage('Analyzing photo…');
      setEstimates([]);
    },
    onSuccess: (items) => {
      setEstimates(items);
      setStatusMessage(null);
    },
    onError: () => setStatusMessage('Could not analyze the photo. Try again.'),
  });

  const matchMutation = useMutation({
    mutationFn: async (ingredient: EstimatedIngredient) => {
      const results = await searchProducts(ingredient.name);
      return results[0] ?? null;
    },
    onMutate: () => setStatusMessage('Matching ingredient…'),
    onSuccess: (product) => {
      if (product) {
        addProduct(product);
        setSelectedProduct(product);
        setStatusMessage(null);
      } else {
        setStatusMessage('No matching product found. Create a custom ingredient instead.');
      }
    },
    onError: () => setStatusMessage('Unable to match this ingredient.'),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      detectMutation.mutate(file);
    }
  };

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
    setSelectedProduct(null);
    onComplete?.();
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 bg-surface p-6 text-center text-sm text-muted">
        <span>Upload meal photo</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </label>

      {statusMessage && <p className="text-sm text-muted">{statusMessage}</p>}

      <ul className="space-y-3">
        {estimates.map((estimate) => (
          <li key={estimate.name} className="rounded-3xl bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{estimate.name}</p>
                <p className="text-xs text-muted">Confidence {Math.round(estimate.confidence * 100)}%</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs"
                onClick={() => matchMutation.mutate(estimate)}
              >
                {matchMutation.isPending ? 'Matching…' : 'Add' }
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ProductDetailSheet
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onConfirm={({ product, meal, portion }) => handleConfirm({ product, meal, portion })}
      />
    </div>
  );
}
