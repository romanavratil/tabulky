import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FoodProduct } from '../types';
import { storage } from '../lib/persist';
import type { StateStorage } from 'zustand/middleware';

type ProductsState = {
  products: Record<string, FoodProduct>;
  addProduct: (product: FoodProduct) => void;
  removeProduct: (id: string) => void;
  getProduct: (id: string) => FoodProduct | undefined;
};

const localForageStorage: StateStorage = {
  getItem: async (name) => {
    const value = await storage.getItem(name);
    if (value == null) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      const serialized = JSON.stringify(value);
      await storage.setItem(name, serialized);
      return serialized;
    } catch (error) {
      console.warn(`[persist] Failed to normalize value for ${name}`, error);
      return null;
    }
  },
  setItem: async (name, value) => {
    await storage.setItem(name, value);
  },
  removeItem: async (name) => {
    await storage.removeItem(name);
  },
};

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: {},
      addProduct: (product) =>
        set((state) => ({
          products: { ...state.products, [product.id]: product },
        })),
      removeProduct: (id) =>
        set((state) => {
          const next = { ...state.products };
          delete next[id];
          return { products: next };
        }),
      getProduct: (id) => get().products[id],
    }),
    {
      name: 'custom-products',
      storage: createJSONStorage(() => localForageStorage),
    },
  ),
);
