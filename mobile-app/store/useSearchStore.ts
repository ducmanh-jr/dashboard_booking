/**
 * ============================================================================
 * TÊN FILE: store/useSearchStore.ts
 * MỤC ĐÍCH: Nơi quản lý trạng thái Bộ lọc Tìm kiếm toàn cục bằng Zustand.
 * Giúp dữ liệu tìm kiếm (địa điểm, ngày, số khách) đồng bộ giữa Trang chủ, 
 * Modal tìm kiếm và màn hình Kết quả Tìm kiếm.
 * ============================================================================
 */
import { create } from 'zustand';

export interface Guests {
  adults: number;
  children: number;
  rooms: number;
}

export interface FilterState {
  minPrice: number;
  maxPrice: number;
  stars: [number, number];
  distCenter: [number, number];
  distBeach: [number, number];
  paymentOptions: string[];
  guestRating: string[];
  area: string[];
  propertyType: string[];
  bedType: string[];
}

interface SearchState {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guests: Guests;
  sortMode: string;
  filters: FilterState;
  setLocation: (location: string) => void;
  setDates: (checkInDate: string, checkOutDate: string) => void;
  setGuests: (guests: Partial<Guests>) => void;
  setSortMode: (mode: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetSearch: () => void;
}

const initialGuests: Guests = {
  adults: 2,
  children: 0,
  rooms: 1,
};

const initialFilters: FilterState = {
  minPrice: 0,
  maxPrice: 50000000, // 50 triệu
  stars: [0, 5],
  distCenter: [0, 50],
  distBeach: [0, 50],
  paymentOptions: [],
  guestRating: [],
  area: [],
  propertyType: [],
  bedType: [],
};

// Set default values mimicking the initial design mockup
export const useSearchStore = create<SearchState>((set) => ({
  location: '',
  checkInDate: '2026-04-25',
  checkOutDate: '2026-04-26',
  guests: initialGuests,
  sortMode: '',
  filters: initialFilters,

  setLocation: (location) => set({ location }),
  
  setDates: (checkInDate, checkOutDate) => set({ checkInDate, checkOutDate }),
  
  setGuests: (newGuests) => 
    set((state) => ({ 
      guests: { ...state.guests, ...newGuests } 
    })),
    
  setSortMode: (sortMode) => set({ sortMode }),
  
  setFilters: (newFilters) => 
    set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
    
  resetSearch: () => set({
    location: '',
    checkInDate: '2026-04-25',
    checkOutDate: '2026-04-26',
    guests: initialGuests,
    sortMode: '',
    filters: initialFilters,
  }),
}));
