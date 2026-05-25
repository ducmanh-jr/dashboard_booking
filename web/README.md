# NoWayHomee Web

Frontend monorepo cho hệ thống NoWayHomee, gồm các ứng dụng web dành cho quản trị viên và đối tác khách sạn. Dự án được tổ chức theo mô hình workspace để chia sẻ API client, giao diện đăng nhập và các cấu hình chung giữa các app.

## Tổng Quan

- `apps/admin`: ứng dụng quản trị hệ thống.
- `apps/partner`: ứng dụng cho đối tác/chủ khách sạn quản lý phòng và đặt phòng.
- `packages/api-client`: API client dùng chung, bọc `fetch`, gửi cookie và xử lý lỗi API.
- `packages/auth-ui`: các component UI dùng chung cho màn hình xác thực.

Backend API mặc định được proxy qua `/api` tới `http://localhost:3001`.

## Công Nghệ Chính

- React 18
- TypeScript
- Vite
- React Router
- Recharts
- Tailwind CSS 4
- Lucide React
- Workspace packages

## Cấu Trúc Thư Mục

```text
web/
+-- apps/
|   +-- admin/
|   |   +-- src/
|   |   |   +-- api/                  # Các hàm gọi API cho admin
|   |   |   +-- app/                  # App, routes, entrypoint
|   |   |   +-- constants/            # Đường dẫn API
|   |   |   +-- features/
|   |   |   |   +-- auth/             # Đăng nhập admin
|   |   |   |   +-- dashboard/        # Các tab quản trị
|   |   |   +-- hooks/                # Hook dùng trong app
|   |   |   +-- shared/               # Layout, type, style, util
|   |   +-- index.html
|   |   +-- package.json
|   |   +-- tsconfig.json
|   |   +-- vite.config.ts
|   +-- partner/
|       +-- src/
|       |   +-- api/                  # Các hàm gọi API cho partner
|       |   +-- app/                  # App, routes, entrypoint
|       |   +-- constants/            # Đường dẫn API
|       |   +-- features/
|       |   |   +-- auth/             # Đăng nhập partner
|       |   |   +-- rooms/            # Dashboard, phòng, booking, thông báo
|       |   +-- hooks/
|       |   +-- shared/
|       +-- index.html
|       +-- package.json
|       +-- tsconfig.json
|       +-- vite.config.ts
+-- packages/
|   +-- api-client/
|   |   +-- index.d.ts
|   |   +-- index.js
|   |   +-- package.json
|   +-- auth-ui/
|       +-- src/
|       |   +-- index.ts
|       |   +-- layout/AuthLayout.tsx
|       |   +-- providers/GoogleButton.tsx
|       +-- package.json
+-- .cursorrules
+-- .gitignore
+-- package.json
+-- README.md
```

## Cài Đặt

Yêu cầu:

- Node.js 18 trở lên
- npm hoặc pnpm
- Backend NoWayHomee chạy tại `http://localhost:3001`

Cài dependencies:

```bash
npm install
```

Nếu dùng pnpm:

```bash
pnpm install
```

## Chạy Local

Chạy ứng dụng admin:

```bash
npm run dev:admin
```

Admin mặc định chạy tại:

```text
http://localhost:5173
```

Chạy ứng dụng partner:

```bash
npm run dev:partner
```

Partner mặc định chạy tại:

```text
http://localhost:5174
```

Cả hai app đều proxy request `/api` về backend:

```text
http://localhost:3001
```

## Scripts

```bash
npm run dev:admin       # Chạy app admin bằng Vite
npm run dev:partner     # Chạy app partner bằng Vite
npm run build:admin     # Build app admin
npm run build:partner   # Build app partner
npm run typecheck       # Kiểm tra TypeScript cho cả admin và partner
```

## Ứng Dụng Admin

Thư mục: `apps/admin`

Admin app phục vụ nhóm quản trị hệ thống. Các route chính:

- `/login`: đăng nhập admin.
- `/dashboard`: tổng quan hệ thống.
- `/partners`: quản lý đối tác/khách sạn.
- `/customers`: quản lý khách hàng.
- `/bookings`: quản lý đặt phòng.
- `/rooms`: quản lý phòng.
- `/admins`: quản lý tài khoản admin.
- `/notifications`: quản lý thông báo.

Thành phần đáng chú ý:

- `AdminLayout`: layout chính sau khi đăng nhập.
- `Login`: form đăng nhập.
- `DashboardTab`, `PartnersTab`, `CustomersTab`, `BookingsTab`, `RoomsTab`, `AdminsTab`, `NotificationsTab`: các khu vực nghiệp vụ trong dashboard.
- `PartnerEditModal`, `PartnerHotelRoomsModal`, `RoomEditModal`: modal thao tác dữ liệu.

## Ứng Dụng Partner

Thư mục: `apps/partner`

Partner app dành cho đối tác khách sạn. Các route chính:

- `/login`: đăng nhập đối tác.
- `/`: dashboard tổng quan.
- `/rooms`: danh sách và chi tiết phòng.
- `/bookings`: quản lý đặt phòng.
- `/create`: tạo phòng mới.
- `/edit/:id`: chỉnh sửa phòng.
- `/notifications`: xem thông báo.

Thành phần đáng chú ý:

- `PartnerLayout`: layout chính của đối tác.
- `RoomEditorForm`: form tạo và chỉnh sửa phòng.
- `RoomDetailModal`: xem chi tiết phòng.
- `RoomsTab`, `BookingsTab`, `DashboardTab`, `NotificationsTab`: các màn hình nghiệp vụ của partner.

## Packages Dùng Chung

### `@nowayhome/api-client`

Package API client dùng chung cho các app.

Chức năng:

- Tạo hàm `api(path, opts)` với base URL mặc định `/api`.
- Gửi request với `credentials: "include"` để hỗ trợ cookie/session.
- Parse JSON response.
- Ném `ApiError` khi API trả về lỗi.
- Phát event `nowayhome:auth-error` khi gặp HTTP `401` hoặc `403`.

### `@nowayhome/auth-ui`

Package chứa UI xác thực dùng chung.

Export:

- `AuthLayout`
- `GoogleButton`

## Lưu Ý Phát Triển

- Alias `@` trong mỗi app trỏ về thư mục `src` của app đó.
- Không commit `node_modules`, `dist`, file log hoặc file hệ thống.
- Khi thêm API mới, nên đặt path trong `constants/apiPaths.ts` và tạo hàm gọi API trong `src/api`.
- Khi thêm màn hình mới, nên tách theo feature trong `src/features`.
- Các type dùng chung trong từng app nằm tại `src/shared/types`.

## Build

Build admin:

```bash
npm run build:admin
```

Build partner:

```bash
npm run build:partner
```

Output build của mỗi app nằm trong thư mục `dist` của app tương ứng.
