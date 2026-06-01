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

let refreshPromise: Promise<string> | null = null;

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
  async (error) => {
    const res = error.response;
    const originalRequest = error.config;
    
    if (
      res?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("/auth/refresh")
    ) {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          refreshPromise ??= apiClient
            .post("/auth/refresh", { refreshToken })
            .then(async (tokens: any) => {
              await SecureStore.setItemAsync("access_token", tokens.accessToken);
              if (tokens.refreshToken) {
                await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
              }
              return tokens.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });

          const accessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
        }
      }

      console.warn("[API Error]: Token hết hạn hoặc Unauthorized. Tự động đăng xuất...");
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
