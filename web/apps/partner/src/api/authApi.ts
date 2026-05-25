import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const login = async (data: any) => {
  return await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const googleLogin = async (credential: string) => {
  return await api("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
};

export const registerPartner = async (data: any) => {
  return await api("/partner/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Dùng cho user đã login (Google) muốn nộp đơn làm đối tác.
 * Không tạo user mới — dùng JWT cookie hiện tại.
 */
export const applyAsPartner = async (data: { hotelName: string; phone?: string }) => {
  return await api("/partner/apply", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const fetchMe = async () => {
  return await api(API_PATHS.AUTH.ME);
};

export const logout = async () => {
  return await api(API_PATHS.AUTH.LOGOUT, { method: "POST" });
};


