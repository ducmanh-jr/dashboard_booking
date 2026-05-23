import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const fetchRooms = async () => {
  return await api(API_PATHS.ROOMS.LIST);
};

export const fetchRoomDetail = async (id: string | number) => {
  return await api(API_PATHS.ROOMS.DETAIL(id));
};

export const createRoom = async (data: any) => {
  return await api(API_PATHS.ROOMS.CREATE, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateRoom = async (id: string | number, data: any) => {
  return await api(API_PATHS.ROOMS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteRoom = async (id: string | number) => {
  return await api(API_PATHS.ROOMS.DELETE(id), {
    method: "DELETE",
  });
};

export const requestDeleteRoom = async (id: string | number) => {
  return await api(`/partner/rooms/${id}/request-delete`, {
    method: "DELETE",
  });
};

export const requestRestoreRoom = async (id: string | number) => {
  return await api(`/partner/rooms/${id}/request-restore`, {
    method: "POST",
  });
};

export const requestUpdateRoom = async (id: string | number, data: any) => {
  return await api(`/partner/rooms/${id}/request-update`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const searchPlaces = async (query: string) => {
  return await api(API_PATHS.PLACES.SEARCH(query));
};

export const fetchNearbyPlaces = async (lat: number, lon: number, radius: number, cats: string) => {
  return await api(API_PATHS.PLACES.NEARBY(lat, lon, radius, cats));
};

export const fetchAvailability = async (propertyId: string | number, from: string, to: string) => {
  return await api(`/partner/availability?propertyId=${propertyId}&from=${from}&to=${to}`);
};

export const updateAvailability = async (data: any) => {
  return await api("/partner/availability", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const bulkUpdateAvailability = async (data: any) => {
  return await api("/partner/availability/bulk", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};
