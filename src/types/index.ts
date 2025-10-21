export type ServingUnit = 'g' | 'ml' | 'piece';

export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
};

export type FoodProductSource = 'off' | 'custom' | 'photo';

export type FoodProduct = {
  id: string;
  source: FoodProductSource;
  name: string;
  brand?: string;
  imageUrl?: string;
  servingSize: { value: number; unit: ServingUnit };
  perServing: Nutrients;
  per100g?: Nutrients;
};

export type MealType = string;

export type MealEntry = {
  id: string;
  productId: string;
  meal: MealType;
  portion: { value: number; unit: ServingUnit };
  nutrients: Nutrients;
  createdAt: string;
};

export type DayLog = {
  date: string; // YYYY-MM-DD
  entries: MealEntry[];
  totals: Nutrients;
  goal?: Nutrients;
};

export type EstimatedIngredient = {
  name: string;
  confidence: number;
  defaultServing: number;
};

export type MacroTargets = Pick<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat'>;

export type Settings = {
  units: 'metric' | 'imperial';
  defaultServingUnit: ServingUnit;
  dailyTargets: MacroTargets;
  theme: 'light' | 'dark' | 'system';
  meals: string[];
  favoriteProductIds?: string[];
};

export type PersistedData = {
  version: number;
  customProducts: Record<string, FoodProduct>;
  logs: Record<string, DayLog>;
  settings: Settings;
};
