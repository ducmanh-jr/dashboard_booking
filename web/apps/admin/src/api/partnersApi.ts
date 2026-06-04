import { api } from "@nowayhome/api-client";

export interface Partner {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  status: string;       // kycStatus: pending | approved | rejected
  userStatus: string;   // account status: active | suspended
  createdAt: string;
  // other fields as needed
}

/** Get partners list with optional status filter */
export const fetchPartners = async (status: string) => {
  const res: any = await api(`/admin/partners?status=${status}`);
  // TransformInterceptor wraps response as { statusCode, message, data }
  return res?.data ?? res;
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
  return await api(`/admin/partners/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
};

/** Reject a partner with reason */
export const rejectPartner = async (id: number, reason: string) => {
  return await api(`/admin/partners/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
};

/** Lock (suspend) a partner account - blocks login */
export const lockPartner = async (id: number) => {
  return await api(`/admin/partners/${id}/lock`, { method: "POST" });
};

/** Unlock (re-activate) a suspended partner account */
export const unlockPartner = async (id: number) => {
  return await api(`/admin/partners/${id}/unlock`, { method: "POST" });
};

/**
 * Thu hồi quyền đối tác: hạ tài khoản về customer, KHÔNG xóa tài khoản.
 * Dùng thay cho deletePartner khi chỉ muốn hủy quyền ĐT của user đã được duyệt.
 */
export const revokePartner = async (id: number) => {
  return await api(`/admin/partners/${id}/revoke`, { method: "POST" });
};

export const fetchPartnerRooms = async (partnerId: number) => {
  const res: any = await api(`/admin/partners/${partnerId}/rooms`);
  return res?.data ?? res;
};
