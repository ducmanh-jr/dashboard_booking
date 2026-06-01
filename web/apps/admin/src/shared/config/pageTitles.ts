import type { RouteTitleEntry } from "../hooks/usePageTitle";

export const ADMIN_PORTAL_NAME = "Admin" as const;

export const ADMIN_ROUTE_TITLES: RouteTitleEntry[] = [
  { path: "/login", title: "Đăng nhập" },
  { path: "/", title: "Tổng quan" },
  { path: "/dashboard", title: "Tổng quan" },
  { path: "/partners", title: "Đối tác" },
  { path: "/customers", title: "Khách hàng" },
  { path: "/bookings", title: "Đặt phòng" },
  { path: "/rooms", title: "Khách sạn" },
  { path: "/admins", title: "Quản trị viên" },
  { path: "/transactions", title: "Giao dịch" },
  { path: "/promotions", title: "Khuyến mãi" },
  { path: "/notifications", title: "Thông báo" },
  { path: "/account", title: "Tài khoản" },
];
