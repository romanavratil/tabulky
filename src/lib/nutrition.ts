import type { DayLog, MealEntry, Nutrients, ServingUnit } from '../types';

const nutrientKeys: Array<keyof Nutrients> = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'salt',
];

const unitWeights: Record<ServingUnit, number> = {
  g: 1,
  ml: 1,
  piece: 0,
};

export function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function fillMissingNutrients(source: Partial<Nutrients>): Nutrients {
  return {
    calories: source.calories ?? 0,
    protein: source.protein ?? 0,
    carbs: source.carbs ?? 0,
    fat: source.fat ?? 0,
    fiber: source.fiber ?? 0,
    sugar: source.sugar ?? 0,
    salt: source.salt ?? 0,
  };
}

export function scaleNutrients(nutrients: Nutrients, scale: number): Nutrients {
  const result: Nutrients = { ...nutrients };
  nutrientKeys.forEach((key) => {
    const value = nutrients[key];
    if (typeof value === 'number') {
      result[key] = round(value * scale, 2);
    }
  });
  return result;
}

export function per100gToPerServing(
  per100g: Nutrients | undefined,
  servingSize: { value: number; unit: ServingUnit },
): Nutrients | undefined {
  if (!per100g) return undefined;
  const weight = toGrams(servingSize);
  if (!weight) return undefined;
  const ratio = weight / 100;
  return scaleNutrients(per100g, ratio);
}

export function toGrams(serving: { value: number; unit: ServingUnit }): number | null {
  if (serving.unit === 'piece') return null;
  const multiplier = unitWeights[serving.unit];
  return round(serving.value * multiplier, 2);
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, item) => {
      nutrientKeys.forEach((key) => {
        const value = item[key];
        if (typeof value === 'number') {
          acc[key] = round((acc[key] ?? 0) + value, 2);
        }
      });
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      salt: 0,
    },
  );
}

export function computeEntryNutrients(
  perServing: Nutrients,
  productServingSize: { value: number; unit: ServingUnit },
  userPortion: { value: number; unit: ServingUnit },
): Nutrients {
  if (userPortion.unit !== productServingSize.unit) {
    const gramServing = toGrams(productServingSize);
    const gramPortion = toGrams(userPortion);
    if (gramServing && gramPortion) {
      return scaleNutrients(perServing, gramPortion / gramServing);
    }
  }
  return scaleNutrients(perServing, userPortion.value / productServingSize.value);
}

export function computeDayTotals(entries: MealEntry[]): Nutrients {
  return sumNutrients(entries.map((entry) => entry.nutrients));
}

export function updateDayLogTotals(log: DayLog): DayLog {
  return { ...log, totals: computeDayTotals(log.entries) };
}
