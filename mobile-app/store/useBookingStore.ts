import { create } from 'zustand';

interface BookingState {
  selectedRoomType: any | null;
  setSelectedRoomType: (roomType: any) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedRoomType: null,
  setSelectedRoomType: (roomType) => set({ selectedRoomType: roomType }),
  clearBooking: () => set({ selectedRoomType: null }),
}));
