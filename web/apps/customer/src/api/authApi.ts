import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const login = async (data: any) => {
  return await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const registerCustomer = async (data: any) => {
  return await api("/customer/auth/register", {
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
