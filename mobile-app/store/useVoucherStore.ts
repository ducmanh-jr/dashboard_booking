import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoucherState {
  savedVouchers: string[]; // List of saved voucher codes
  saveVoucher: (code: string) => void;
  removeVoucher: (code: string) => void;
  isSaved: (code: string) => boolean;
}

export const useVoucherStore = create<VoucherState>()(
  persist(
    (set, get) => ({
      savedVouchers: [],
      saveVoucher: (code) => set((state) => {
        const cleanCode = code.toUpperCase().trim();
        if (state.savedVouchers.includes(cleanCode)) return state;
        return { savedVouchers: [...state.savedVouchers, cleanCode] };
      }),
      removeVoucher: (code) => set((state) => {
        const cleanCode = code.toUpperCase().trim();
        return { savedVouchers: state.savedVouchers.filter((c) => c !== cleanCode) };
      }),
      isSaved: (code) => {
        const cleanCode = code.toUpperCase().trim();
        return get().savedVouchers.includes(cleanCode);
      },
    }),
    {
      name: 'voucher-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
