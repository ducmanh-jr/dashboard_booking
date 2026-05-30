import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const fetchNotifications = async () => {
  return await api(`${API_PATHS.NOTIFICATIONS.LIST}?t=${Date.now()}`);
};

export const fetchUnreadCount = async () => {
  return await api(`${API_PATHS.NOTIFICATIONS.UNREAD_COUNT}?t=${Date.now()}`);
};

export const markAsRead = async (id: number) => {
  return await api(`/notifications/${id}/read`, { method: "POST" });
};

export const markReadAll = async () => {
  return await api("/notifications/read-all", { method: "POST" });
};

export const deleteNotification = async (id: number) => {
  return await api(`/notifications/${id}`, { method: "DELETE" });
};
