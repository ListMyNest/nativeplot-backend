import { create } from "zustand";

export type FilterStore = {
  city: string;
  propertyType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  searchQuery: string;
  setCity: (city: string) => void;
  setPropertyType: (propertyType: string | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setSearchQuery: (q: string) => void;
  resetFilters: () => void;
};

const initial = {
  city: "Bidar",
  propertyType: null as string | null,
  priceMin: null as number | null,
  priceMax: null as number | null,
  searchQuery: "",
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initial,
  setCity: (city) => set({ city }),
  setPropertyType: (propertyType) => set({ propertyType }),
  setPriceRange: (priceMin, priceMax) => set({ priceMin, priceMax }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () => set({ ...initial }),
}));
