// services/apiClient.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Timeout 10s để tránh app bị treo
});

// Interceptor: Nhét JWT Token vào Header
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Chuẩn hóa lỗi từ NestJS
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const res = error.response;
    
    if (res?.status === 401) {
      console.warn("[API Error]: Token hết hạn hoặc Unauthorized. Tự động đăng xuất...");
      // Xóa token khỏi máy an toàn bằng secure store, và dùng require chống vòng lặp
      try {
        const { useAuthStore } = require('../store/useAuthStore');
        useAuthStore.getState().logout();
      } catch (err) {
        console.warn("Không thể gọi logout từ store:", err);
      }
      return Promise.reject(new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."));
    }

    if (res && res.data) {
      // Bóc tách lỗi từ NestJS Exception Filter
      const errorMessage = Array.isArray(res.data.message)
        ? res.data.message[0]
        : res.data.message || "Lỗi kết nối máy chủ";

      console.error("[API Error]:", errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
