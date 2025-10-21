import { memo } from 'react';
import type { FoodProduct } from '../types';

type Props = {
  product: FoodProduct;
  onSelect?: (product: FoodProduct) => void;
};

function ProductCardComponent({ product, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(product)}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-surface px-4 py-3 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          className="h-14 w-14 flex-none rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-14 w-14 flex-none rounded-xl bg-surfaceMuted" aria-hidden="true" />
      )}
      <div className="flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        {product.brand && <p className="truncate text-xs text-muted">{product.brand}</p>}
        <p className="mt-1 text-xs text-muted">{Math.round(product.perServing.calories)} kcal / {product.servingSize.value}{' '}{product.servingSize.unit}</p>
      </div>
    </button>
  );
}

const ProductCard = memo(ProductCardComponent);
export default ProductCard;
