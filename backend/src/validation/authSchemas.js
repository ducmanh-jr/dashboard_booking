import { z } from "zod";

/**
 * Schema cho đăng ký đối tác (partner)
 */
export const registerPartnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  fullName: z.string().max(200),
  phone: z.string().max(30).optional().nullable(),
  hotelName: z.string().max(200),
});

/**
 * Schema cho đăng ký khách hàng (customer)
 */
export const registerCustomerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  fullName: z.string().max(200),
  phone: z.string().max(30).optional().nullable(),
});

/**
 * Schema cho login (common for both types) – chỉ ví dụ, có thể mở rộng.
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const adminCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(1).max(200),
});
