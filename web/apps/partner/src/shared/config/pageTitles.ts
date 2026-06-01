import type { RouteTitleEntry } from "../hooks/usePageTitle";

export const PARTNER_PORTAL_NAME = "Partner" as const;

export const PARTNER_ROUTE_TITLES: RouteTitleEntry[] = [
  { path: "/login", title: "Đăng nhập" },
  { path: "/", title: "Tổng quan" },
  { path: "/rooms", title: "Khách sạn của tôi" },
  { path: "/bookings", title: "Đặt phòng" },
  { path: "/transactions", title: "Dòng tiền" },
  { path: "/create", title: "Thêm khách sạn" },
  { path: "/edit/:id", title: "Chỉnh sửa khách sạn" },
  { path: "/notifications", title: "Thông báo" },
  { path: "/account", title: "Tài khoản" },
];
