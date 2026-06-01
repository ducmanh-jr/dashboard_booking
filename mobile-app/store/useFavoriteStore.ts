import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property } from '../components/PropertyCard';

interface FavoriteState {
  favorites: Property[];
  toggleFavorite: (property: Property) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (property) => set((state) => {
        const exists = state.favorites.some((p) => p.id === property.id);
        if (exists) {
          return { favorites: state.favorites.filter((p) => p.id !== property.id) };
        } else {
          return { favorites: [...state.favorites, property] };
        }
      }),
      isFavorite: (id) => get().favorites.some((p) => p.id === id),
    }),
    {
      name: 'favorite-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
