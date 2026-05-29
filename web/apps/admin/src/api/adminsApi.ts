import { api } from "@nowayhome/api-client";

export const fetchAdmins = async () => {
  return await api("/admin/admins");
};

export const createAdmin = async (data: any) => {
  return await api("/admin/admins", { method: "POST", body: JSON.stringify(data) });
};

export const createGoogleAdmin = async (data: any) => {
  return await api("/admin/admins/google", { method: "POST", body: JSON.stringify(data) });
};

export const deleteAdmin = async (id: number) => {
  return await api(`/admin/admins/${id}`, { method: "DELETE" });
};

export const updateAdmin = async (id: number, data: any) => {
  return await api(`/admin/admins/${id}`, { method: "PATCH", body: JSON.stringify(data) });
};

export const fetchStats = async (period: string) => {
  return await api(`/admin/stats?period=${period}`);
};
