import { api } from "@nowayhome/api-client";

export interface CreateVoucherPayload {
  code: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  maxUses?: number;
  maxUsesPerUser?: number;
  name?: string;
}

export interface VoucherItem {
  id: number;
  code: string;
  name: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  isActive: boolean;
}

export const fetchVouchers = async (): Promise<VoucherItem[]> => {
  return await api("/partner/vouchers");
};

export const createVoucher = async (payload: CreateVoucherPayload): Promise<any> => {
  return await api("/partner/vouchers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const deleteVoucher = async (code: string): Promise<any> => {
  return await api(`/partner/vouchers/${code}`, {
    method: "DELETE",
  });
};