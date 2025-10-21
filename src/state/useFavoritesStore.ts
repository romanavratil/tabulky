import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { FoodProduct } from '../types';
import { storage } from '../lib/persist';

export type FavoriteProduct = FoodProduct & { addedAt: string };

type FavoritesState = {
  items: Record<string, FavoriteProduct>;
  order: string[];
  addFavorite: (product: FoodProduct) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
};

const localForageStorage: StateStorage = {
  getItem: async (name) => (await storage.getItem<string>(name)) ?? null,
  setItem: async (name, value) => {
    await storage.setItem(name, value);
  },
  removeItem: async (name) => {
    await storage.removeItem(name);
  },
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: {},
      order: [],
      addFavorite: (product) =>
        set((state) => {
          const existing = state.items[product.id];
          const items = {
            ...state.items,
            [product.id]: {
              ...product,
              addedAt: existing?.addedAt ?? new Date().toISOString(),
            },
          };
          const order = [product.id, ...state.order.filter((id) => id !== product.id)];
          return { items, order };
        }),
      removeFavorite: (productId) =>
        set((state) => {
          if (!state.items[productId]) return state;
          const { [productId]: _removed, ...rest } = state.items;
          return {
            items: rest,
            order: state.order.filter((id) => id !== productId),
          };
        }),
      isFavorite: (productId) => Boolean(get().items[productId]),
      clearFavorites: () => set({ items: {}, order: [] }),
    }),
    {
      name: 'favorites',
      storage: createJSONStorage(() => localForageStorage),
    },
  ),
);
