import type { EstimatedIngredient } from '../types';

export async function estimateIngredientsFromPhoto(
  _file: File,
): Promise<Array<EstimatedIngredient>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    { name: 'Chicken breast', confidence: 0.86, defaultServing: 120 },
    { name: 'Rice', confidence: 0.78, defaultServing: 180 },
    { name: 'Broccoli', confidence: 0.74, defaultServing: 90 },
  ];
}
