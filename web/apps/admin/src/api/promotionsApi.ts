import { api } from "@nowayhome/api-client";

export type PromoType = "early_bird" | "last_minute" | "long_stay" | "flash_sale" | "loyalty" | "custom";
export type DiscountType = "percent" | "fixed";
export type PromoStatus = "active" | "inactive" | "upcoming" | "expired";
export type PromoFilter = "all" | "active" | "inactive" | "upcoming" | "expired";

export interface Voucher {
  id: number;
  code: string;
  isActive: boolean;
  totalUsed: number;
  maxUsesPerUser: number;
  createdAt: string;
}

export interface Promotion {
  id: number;
  name: string;
  promoType: PromoType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  maxUses: number | null;
  totalUsed: number;
  isActive: boolean;
  status: PromoStatus;
  partnerName: string | null;
  partnerId: number | null;
  voucherCount: number;
  vouchers: Voucher[];
  createdAt: string;
}

export interface CreatePromotionPayload {
  name: string;
  promoType: PromoType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  startDate: string;
  endDate: string;
  maxUses?: number;
  partnerId?: number;
}

export const fetchPromotions = async (filter: PromoFilter = "all"): Promise<Promotion[]> => {
  return await api(`/admin/promotions?filter=${filter}`);
};

export const fetchPromotion = async (id: number): Promise<Promotion> => {
  return await api(`/admin/promotions/${id}`);
};

export const createPromotion = async (data: CreatePromotionPayload): Promise<Promotion> => {
  return await api(`/admin/promotions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updatePromotion = async (id: number, data: Partial<CreatePromotionPayload> & { isActive?: boolean }): Promise<Promotion> => {
  return await api(`/admin/promotions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const togglePromotion = async (id: number): Promise<Promotion> => {
  return await api(`/admin/promotions/${id}/toggle`, { method: "PATCH" });
};

export const deletePromotion = async (id: number): Promise<void> => {
  return await api(`/admin/promotions/${id}`, { method: "DELETE" });
};

export const fetchVouchers = async (promotionId: number): Promise<Voucher[]> => {
  return await api(`/admin/promotions/${promotionId}/vouchers`);
};

export const createVoucher = async (promotionId: number, data: { code: string; maxUsesPerUser?: number }): Promise<Voucher> => {
  return await api(`/admin/promotions/${promotionId}/vouchers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
