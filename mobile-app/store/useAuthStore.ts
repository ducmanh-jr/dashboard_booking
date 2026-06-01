/**
 * ============================================================================
 * TÊN FILE: store/useAuthStore.ts
 * MỤC ĐÍCH: Nơi quản lý trạng thái Đăng nhập toàn cục (Global State) bằng Zustand.
 * Bất kỳ màn hình nào cũng có thể truy cập `useAuthStore` để lấy thông tin User.
 * ============================================================================
 */

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { authService, LoginPayload, RegisterPayload, User } from '../services/authService';

// Định nghĩa cấu trúc của Store
interface AuthState {
  user: User | null;          // Chứa thông tin người dùng đang đăng nhập
  hasToken: boolean;          // Đánh dấu người dùng đã có token hay chưa
  isTokenReady: boolean;      // Báo hiệu đã kiểm tra token dưới local xong chưa
  isLoading: boolean;         // Trạng thái chờ API (hiện Spinner)
  error: string | null;       // Lưu thông báo lỗi nếu API thất bại
  
  // Các hàm hành động (Actions)
  login: (credentials: LoginPayload) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkLocalToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hasToken: false,
  isTokenReady: false,
  isLoading: false,
  error: null,

  // Xóa thông báo lỗi cũ khi người dùng thao tác lại
  clearError: () => set({ error: null }),

  /**
   * Kiểm tra xem dưới bộ nhớ đệm (SecureStore) đã có token chưa khi app vừa khởi động.
   */
  checkLocalToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      // Tạm thời nếu có token thì coi như user đã đăng nhập.
      // (Nâng cao: Có thể gọi API /auth/me để lấy lại thông tin user từ server).
      if (token) {
        set({ isTokenReady: true, hasToken: true });
      } else {
        set({ isTokenReady: true, user: null, hasToken: false });
      }
    } catch (e) {
      set({ isTokenReady: true, user: null });
    }
  },

  /**
   * Hàm xử lý quá trình Đăng nhập
   */
  login: async (credentials: LoginPayload) => {
    set({ isLoading: true, error: null }); // Bật loading spinner, xóa lỗi cũ
    try {
      // Gọi lên file authService
      const response = await authService.login(credentials);
      
      // Nếu thành công, lưu chuỗi JWT token một cách an toàn vào máy
      if (response.access_token) {
        await SecureStore.setItemAsync('access_token', response.access_token);
      }
      
      // Đưa thông tin user vào Global State để hiển thị ra UI, tắt loading
      set({ user: response.user, isLoading: false, hasToken: true });
    } catch (error: any) {
      // Bắt lỗi từ server và gán vào biến error
      set({ error: error.message || 'Đăng nhập thất bại', isLoading: false });
      throw error; // Ném lỗi này ra ngoài để màn hình Login.tsx hiển thị Alert
    }
  },

  /**
   * Hàm xử lý Đăng nhập bằng Google
   */
  googleLogin: async (credential: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.googleLogin(credential);
      if (response.access_token) {
        await SecureStore.setItemAsync('access_token', response.access_token);
      }
      set({ user: response.user, isLoading: false, hasToken: true });
    } catch (error: any) {
      set({ error: error.message || 'Đăng nhập bằng Google thất bại', isLoading: false });
      throw error;
    }
  },

  /**
   * Hàm xử lý quá trình Đăng ký
   */
  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(payload);
      
      if (response.access_token) {
        await SecureStore.setItemAsync('access_token', response.access_token);
        set({ user: response.user, isLoading: false, hasToken: true });
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Đăng ký thất bại', isLoading: false });
      throw error;
    }
  },

  /**
   * Hàm xử lý quá trình Đăng xuất
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      // Xóa token khỏi máy
      await SecureStore.deleteItemAsync('access_token');
      // Trả state về ban đầu
      set({ user: null, isLoading: false, error: null, hasToken: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));
