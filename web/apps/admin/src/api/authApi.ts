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

export const logout = async () => {
  return await api(API_PATHS.AUTH.LOGOUT, {
    method: "POST",
  });
};

export const fetchMe = async () => {
  return await api(API_PATHS.AUTH.ME);
};

