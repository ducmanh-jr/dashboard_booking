import { api } from "@nowayhome/api-client";

export const fetchRooms = async (status: string = "all") => {
  return await api(`/admin/rooms?status=${status}`);
};

export const approveRoom = async (propertyId: number) => {
  return await api(`/admin/rooms/${propertyId}/approve`, { method: "POST" });
};

export const updateRoom = async (id: number, data: any) => {
  return await api(`/admin/rooms/${id}`, { method: "PATCH", body: JSON.stringify(data) });
};

export const deleteRoom = async (id: number) => {
  return await api(`/admin/rooms/${id}`, { method: "DELETE" });
};

export const approveRoomRequest = async (requestId: number) => {
  return await api(`/admin/room-change-requests/${requestId}/approve`, { method: "POST" });
};

export const rejectRoomRequest = async (requestId: number, reason: string) => {
  return await api(`/admin/room-change-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

export const rejectRoom = async (id: number, reason: string) => {
  return await api(`/admin/rooms/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

