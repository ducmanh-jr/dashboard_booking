import { api } from "@nowayhome/api-client";

export interface Partner {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  createdAt: string;
  // other fields as needed
}

/** Get partners list with optional status filter */
export const fetchPartners = async (status: string) => {
  return await api(`/admin/partners?status=${status}`);
};

/** Update partner details */
export const updatePartner = async (id: number, payload: Partial<Partner>) => {
  return await api(`/admin/partners/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
};

/** Delete a partner */
export const deletePartner = async (id: number) => {
  return await api(`/admin/partners/${id}`, { method: "DELETE" });
};

/** Approve a partner */
export const approvePartner = async (id: number) => {
  return await api(`/admin/partners/${id}/approve`, { method: "POST" });
};

/** Reject a partner with reason */
export const rejectPartner = async (id: number, reason: string) => {
  return await api(`/admin/partners/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
};

export const fetchPartnerRooms = async (partnerId: number) => {
  return await api(`/admin/partners/${partnerId}/rooms`);
};
