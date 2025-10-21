import { useState } from 'react';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { FoodProduct, MealType, ServingUnit } from '../types';
import ProductDetailSheet from './ProductDetailSheet';
import { useProductsStore } from '../state/useProductsStore';
import { useLogsStore } from '../state/useLogsStore';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  brand: z.string().optional(),
  servingValue: z.coerce.number().min(1),
  servingUnit: z.enum(['g', 'ml', 'piece'] as [ServingUnit, ServingUnit, ServingUnit]),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  fiber: z.coerce.number().min(0).optional(),
  sugar: z.coerce.number().min(0).optional(),
  salt: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NutrientForm() {
  const addProduct = useProductsStore((state) => state.addProduct);
  const upsertEntry = useLogsStore((state) => state.upsertEntry);
  const navigate = useNavigate();
  const [createdProduct, setCreatedProduct] = useState<FoodProduct | null>(null);

  const resolver = zodResolver(schema) as Resolver<FormValues>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      servingValue: 100,
      servingUnit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      salt: 0,
    },
    resolver,
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const id = `custom_${Math.random().toString(36).slice(2)}`;
    const perServing = {
      calories: values.calories,
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      fiber: values.fiber ?? 0,
      sugar: values.sugar ?? 0,
      salt: values.salt ?? 0,
    };
    const product: FoodProduct = {
      id,
      source: 'custom',
      name: values.name,
      brand: values.brand,
      servingSize: { value: values.servingValue, unit: values.servingUnit },
      perServing,
      per100g: values.servingUnit === 'g' ? perServing : undefined,
    };
    addProduct(product);
    setCreatedProduct(product);
    reset();
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
    setCreatedProduct(null);
    navigate('/');
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            {...register('name')}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-muted" htmlFor="brand">
            Brand (optional)
          </label>
          <input
            id="brand"
            {...register('brand')}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted" htmlFor="servingValue">
              Serving size
            </label>
            <input
              id="servingValue"
              type="number"
              min={1}
              {...register('servingValue')}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted" htmlFor="servingUnit">
              Unit
            </label>
            <select
              id="servingUnit"
              {...register('servingUnit')}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
            >
              <option value="g">Gram</option>
              <option value="ml">Millilitre</option>
              <option value="piece">Piece</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'].map((field) => (
            <div key={field}>
              <label className="text-sm font-medium text-muted capitalize" htmlFor={field}>
                {field}
              </label>
              <input
                id={field}
                type="number"
                min={0}
                step="0.1"
                {...register(field as keyof FormValues)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
              />
              {errors[field as keyof FormValues] && (
                <p className="text-xs text-red-500">
                  {errors[field as keyof FormValues]?.message?.toString()}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft"
        >
          Save ingredient
        </button>
      </form>

      <ProductDetailSheet
        product={createdProduct}
        open={Boolean(createdProduct)}
        onClose={() => setCreatedProduct(null)}
        onConfirm={({ product, meal, portion }) =>
          handleConfirm({ product, meal, portion })
        }
      />
    </>
  );
}
