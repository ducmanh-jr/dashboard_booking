/**
 * ============================================================================
 * TÊN FILE: services/authService.ts
 * MỤC ĐÍCH: Lớp Dịch Vụ (Service Layer) chuyên xử lý giao tiếp API với Backend
 * cho phân hệ Xác thực (Authentication) như Đăng nhập, Đăng ký, Quên mật khẩu.
 * ============================================================================
 */

import apiClient from './apiClient';

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES) ---
// Giúp TypeScript kiểm tra lỗi ngay trong lúc code, đảm bảo truyền đúng và đủ tham số

export interface LoginPayload { 
  email: string; 
  password?: string; 
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  userType?: string;
}

export interface User { 
  id: string; 
  fullName: string; 
  email: string; 
  phone?: string; 
  avatar?: string; 
  role?: string; 
}

export interface AuthResponse { 
  user: User; 
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordPayload { 
  oldPassword?: string; 
  newPassword?: string; 
}

// Dữ liệu User ảo (Mock Data) dùng tạm thời khi chưa có Backend thật
const MOCK_USER: User = {
  id: 'user_12345',
  fullName: 'Kiet Nguyen',
  email: 'test@nowayhome.com',
  phone: '0123456789',
};

// --- CÁC HÀM XỬ LÝ GỌI API (SERVICE METHODS) ---
export const authService = {
  
  /**
   * Gọi API Đăng nhập
   * @param payload chứa email và password
   */
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials);
  },

  /**
   * Gọi API Đăng nhập bằng Google
   * @param credential chứa idToken của Google
   */
  googleLogin: async (credential: string): Promise<AuthResponse> => {
    return apiClient.post('/auth/google', { credential });
  },

  /**
   * Gọi API Đăng ký tài khoản
   */
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', payload);
  },

  /**
   * Gọi API Gửi yêu cầu quên mật khẩu
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Gọi API Đổi mật khẩu
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    return apiClient.post('/auth/change-password', payload);
  },
};
