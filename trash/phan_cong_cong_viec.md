# 📋 PHÂN CÔNG CÔNG VIỆC - DỰ ÁN NOWAYHOME
> **Thời gian:** 17/03/2026 – 02/06/2026 (9 tuần)  
> **Thành viên:** 5 người  
> **Phạm vi:** Backend · Mobile App · Web Admin · Web Partner *(Loại trừ: Web Customer)*

---

## 🧑‍💻 PHÂN CÔNG VAI TRÒ THÀNH VIÊN

| Thành viên | Vai trò chính | Phụ trách |
|---|---|---|
| **A (Lead BE)** | Backend Lead | NestJS core, Auth, Security, DB schema, API design |
| **B (BE Dev)** | Backend Dev | Modules: Bookings, Payments, Promotions, Vouchers |
| **C (Mobile)** | Mobile Dev | React Native / Expo – Customer App |
| **D (Web Admin)** | Web Admin Dev | React/Vite – Admin Dashboard |
| **E (Web Partner)** | Web Partner Dev | React/Vite – Partner Portal |

---

## 📅 TUẦN 1: 17/03/2026 – 07/04/2026
> **Mục tiêu:** Setup môi trường, thiết kế DB, khung dự án

| Thành viên | Công việc |
|---|---|
| **A** | ✅ Setup NestJS project, Docker PostgreSQL, Prisma schema (users, auth tables) · Thiết kế RBAC (Customer/Host/Admin) · JWT Auth module (access/refresh token) |
| **B** | ✅ Setup workspace monorepo (pnpm-workspace) · Thiết kế schema bảng: properties, rooms, bookings, payments · Viết seed data cơ bản |
| **C** | ✅ Setup Expo project, Expo Router, cấu trúc thư mục · Setup Axios client + SecureStore cho token · Tạo màn hình Login / Register UI |
| **D** | ✅ Setup Vite + React + TailwindCSS cho Admin app · Thiết kế layout: sidebar, header, routing · Màn hình Login Admin |
| **E** | ✅ Setup Vite + React + TailwindCSS cho Partner app · Thiết kế layout: sidebar, routing · Màn hình Login Partner |

---

## 📅 TUẦN 2: 08/04/2026 – 14/04/2026
> **Mục tiêu:** Auth hoàn chỉnh, CRUD cơ bản

| Thành viên | Công việc |
|---|---|
| **A** | ✅ API Auth hoàn chỉnh: `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` · Guards (JwtAuthGuard, RolesGuard) · Swagger setup |
| **B** | ✅ Module Properties: CRUD cơ bản · Module Rooms: CRUD · Prisma relations (Property → Rooms → Bookings) |
| **C** | ✅ Flow Auth mobile hoàn chỉnh: Login → lưu token SecureStore → auto-refresh · Màn hình Home (tab index) · Tích hợp API auth |
| **D** | ✅ Tích hợp API Auth vào Admin · Dashboard tổng quan (placeholder) · Quản lý User: danh sách, chi tiết |
| **E** | ✅ Tích hợp API Auth vào Partner · Màn hình Account/Profile partner · Setup Zustand stores |

---

## 📅 TUẦN 3: 15/04/2026 – 21/04/2026
> **Mục tiêu:** Tính năng search, property listing, quản lý phòng

| Thành viên | Công việc |
|---|---|
| **A** | ✅ API Properties: search/filter (query params: city, checkin, checkout, guests, priceRange) · Pagination chuẩn · Upload ảnh (Cloudinary pre-signed URL) |
| **B** | ✅ Module Users: profile, update · Module Partner: đăng ký trở thành host, profile partner |
| **C** | ✅ Màn hình Search (search.tsx) – filter nâng cao · SearchModal (searchModal.tsx) · PropertyCard component · Kết nối API search |
| **D** | ✅ Quản lý Partner: danh sách, duyệt/từ chối partner · Thống kê dashboard: số user, số booking, doanh thu |
| **E** | ✅ Quản lý Phòng (rooms feature): danh sách phòng, thêm/sửa/xóa phòng · Upload ảnh phòng |

---

## 📅 TUẦN 4: 22/04/2026 – 28/04/2026
> **Mục tiêu:** Chi tiết phòng, đặt phòng (booking flow), quản lý booking

| Thành viên | Công việc |
|---|---|
| **A** | ✅ API Bookings: tạo booking (transaction + row lock) · Kiểm tra conflict ngày · API get danh sách booking theo user/partner |
| **B** | ✅ Module Reviews: tạo review, get review theo property · Module Favorites: add/remove/list · Prisma schema reviews, favorites |
| **C** | ✅ Màn hình chi tiết phòng `room/[id].tsx` – gallery, thông tin, chọn ngày · Màn hình Trips (lịch đặt phòng) |
| **D** | ✅ Quản lý Booking (Admin): danh sách toàn bộ booking, lọc theo trạng thái |
| **E** | ✅ Quản lý Booking (Partner): danh sách booking của mình, confirm/cancel booking |

---

## 📅 TUẦN 5: 29/04/2026 – 05/05/2026
> **Mục tiêu:** Thanh toán, Voucher, Promotions

| Thành viên | Công việc |
|---|---|
| **A** | ✅ API Payments: tạo payment, webhook callback · Module Vouchers backend: apply voucher khi checkout · Tích hợp payment gateway |
| **B** | ✅ Module Promotions: CRUD khuyến mãi · Logic apply promotion vào booking · API kiểm tra voucher hợp lệ |
| **C** | ✅ Flow thanh toán mobile: màn hình `payment/index.tsx` · Chọn voucher/mã giảm giá · Màn hình `payment/success.tsx` |
| **D** | ✅ Quản lý Voucher (Admin): danh sách, tạo/sửa/xóa voucher hệ thống |
| **E** | ✅ Quản lý Voucher (Partner): tạo voucher riêng cho property · Xem lịch sử giao dịch (transactions) |

---

## 📅 TUẦN 6: 06/05/2026 – 12/05/2026
> **Mục tiêu:** Favorites, Reviews, Notifications, Profile

| Thành viên | Công việc |
|---|---|
| **A** | ✅ API Notifications (nếu có) · Refactor global error handling (chuẩn errorCode Enum) · Rate limiting, input validation toàn bộ |
| **B** | ✅ Hoàn thiện module Reviews: moderation, report · Module Admin: config system fee, quản lý thông tin hệ thống |
| **C** | ✅ Màn hình Favorites/Wishlist (useFavoriteStore) · Màn hình Reviews · Màn hình Profile: edit profile, đổi avatar (upload) |
| **D** | ✅ Quản lý Reviews (Admin): duyệt/ẩn review · Cấu hình hệ thống: phí, config |
| **E** | ✅ Trang thống kê doanh thu Partner (transactions) · Biểu đồ doanh thu theo tháng |

---

## 📅 TUẦN 7: 13/05/2026 – 19/05/2026
> **Mục tiêu:** Security hardening, UX polish, tích hợp đầu cuối

| Thành viên | Công việc |
|---|---|
| **A** | ✅ Security audit: CORS, Helmet, SQL injection, XSS · Test toàn bộ Auth flow (token expiry, refresh) · API documentation Swagger hoàn chỉnh |
| **B** | ✅ Performance: query optimization (Prisma select, include) · Pagination chuẩn hóa · Test Concurrency (booking conflict) |
| **C** | ✅ UX polish mobile: loading states, skeleton, empty states · Handle lỗi global (Axios interceptor) · Test flow đầu cuối |
| **D** | ✅ UX polish Admin: responsive, error states · Test toàn bộ chức năng Admin · Kết nối đầy đủ API thực |
| **E** | ✅ UX polish Partner: responsive, form validation · Test toàn bộ chức năng Partner · Kết nối đầy đủ API thực |

---

## 📅 TUẦN 8: 20/05/2026 – 26/05/2026
> **Mục tiêu:** Testing, bug fix, tích hợp thực tế

| Thành viên | Công việc |
|---|---|
| **A** | ✅ Fix bug backend từ testing · Viết unit test cho các service quan trọng (Auth, Booking, Payment) · Cập nhật database snapshot |
| **B** | ✅ Fix bug module Booking/Payment · End-to-end test luồng đặt phòng → thanh toán · Seed data thực tế đầy đủ |
| **C** | ✅ Fix bug mobile · Test trên thiết bị thật (iOS + Android) · Tối ưu performance: FlatList, memo |
| **D** | ✅ Fix bug Admin · Cross-browser testing · Deploy Admin app (preview) |
| **E** | ✅ Fix bug Partner · Test toàn bộ flows Partner · Deploy Partner app (preview) |

---

## 📅 TUẦN 9: 27/05/2026 – 02/06/2026
> **Mục tiêu:** Hoàn thiện, demo, báo cáo

| Thành viên | Công việc |
|---|---|
| **A** | ✅ Deploy backend lên server · Cấu hình environment production · Cập nhật README hướng dẫn chạy dự án · Hỗ trợ demo |
| **B** | ✅ Chuẩn bị database snapshot cuối · Viết ERD / System Design diagram · Hỗ trợ làm báo cáo (phần Backend) |
| **C** | ✅ Build APK/IPA demo · Chuẩn bị script demo mobile · Viết báo cáo phần Mobile App |
| **D** | ✅ Chuẩn bị slides thuyết trình Admin · Quay/chụp video demo Admin · Viết báo cáo phần Admin |
| **E** | ✅ Chuẩn bị slides thuyết trình Partner · Quay/chụp video demo Partner · Viết báo cáo phần Partner |

---

## 📊 TỔNG KẾT PHÂN CÔNG THEO MODULE

| Module / Tính năng | Backend | Mobile | Admin | Partner |
|---|---|---|---|---|
| Auth (Login/Register/JWT) | A | C | D | E |
| Properties & Search | A | C | — | — |
| Rooms Management | B | — | — | E |
| Bookings | A | C | D | E |
| Payments | A+B | C | D | E |
| Vouchers & Promotions | A+B | C | D | E |
| Reviews | B | C | D | — |
| Favorites / Wishlist | B | C | — | — |
| User / Profile | B | C | D | — |
| Partner Management | B | — | D | E |
| Admin Dashboard | B | — | D | — |
| Notifications | A | C | — | — |

---

> **Ghi chú:**
> - File `database/snapshots/` (schema.sql, data.sql) do **A + B** cùng duy trì.
> - `web/apps/customer/` **không nằm trong phạm vi** theo yêu cầu.
> - Mỗi thành viên tự quản lý branch riêng, PR vào `main` qua code review.
