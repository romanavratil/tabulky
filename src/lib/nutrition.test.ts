import { describe, expect, it } from 'vitest';
import { computeEntryNutrients, per100gToPerServing } from './nutrition';

const per100g = {
  calories: 200,
  protein: 10,
  carbs: 20,
  fat: 5,
  fiber: 2,
  sugar: 4,
  salt: 1,
};

describe('nutrition helpers', () => {
  it('scales nutrients per serving correctly', () => {
    const serving = { value: 50, unit: 'g' as const };
    const perServing = per100gToPerServing(per100g, serving);
    expect(perServing?.calories).toBeCloseTo(100);
  });

  it('computes entry nutrients based on portion', () => {
    const serving = { value: 100, unit: 'g' as const };
    const entry = computeEntryNutrients(per100g, serving, { value: 150, unit: 'g' });
    expect(entry.calories).toBeCloseTo(300);
  });
});
