# Hướng dẫn chạy dự án bằng script (Windows)

Tài liệu này dành cho máy Windows, sử dụng script tự động để khởi chạy toàn bộ hệ thống Nowayhome.

---

## 1. Yêu cầu cài sẵn

Cần có các công cụ sau:

- Node.js
- pnpm
- Docker Desktop

Kiểm tra nhanh:

```powershell
node --version
pnpm --version
docker --version
```

Nếu `docker --version` có kết quả nhưng Docker chưa chạy, mở Docker Desktop và đợi start xong trước khi chạy script.

---

## 2. Mở thư mục dự án

```powershell
cd đường-dẫn-đến-NoWayHomee
```

---

## 3. Cài dependencies

```powershell
pnpm install
```

---

## 4. Tạo file môi trường cho backend

Nếu chưa có file `backend/.env`, tạo từ file mẫu:

```powershell
copy backend\.env.example backend\.env
```

Nội dung tối thiểu cần có trong `backend/.env`:

```env
DATABASE_URL="postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
JWT_ACCESS_SECRET="change_me_access_secret"
JWT_REFRESH_SECRET="change_me_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
```

> Có thể thêm `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `SUPER_ADMIN_EMAILS` nếu cần dùng OAuth và phân quyền admin.

---

## 5. Generate Prisma Client

Chạy lệnh này sau khi cài dependencies và trước lần chạy đầu tiên:

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

---

## 6. Chạy toàn bộ hệ thống bằng script

```powershell
.\start-all.bat
```

Script `start-all.ps1` tự động thực hiện theo thứ tự:

1. Kiểm tra pnpm (tự cài nếu thiếu)
2. Kiểm tra cấu trúc thư mục bắt buộc
3. Dừng các tiến trình cũ trên port `3001`, `5173`, `5174`, `5175`, `8081`
4. Kiểm tra Docker Desktop (tự start nếu chưa chạy, chờ tối đa 150 giây)
5. Khởi động PostgreSQL bằng Docker (`nowayhome-postgres`, port `5432`)
6. Chờ port `5432` sẵn sàng
7. Nạp lại DB từ snapshot (`database/snapshots/schema.sql` + `data.sql`)
8. `pnpm install` trong backend
9. `prisma generate`
10. Build backend (`nest build`)
11. Mở 5 terminal window riêng biệt:
    - `nwh-backend` — NestJS API, port `3001`
    - `nwh-admin` — Admin web, port `5173`
    - `nwh-partner` — Partner web, port `5174`
    - `nwh-customer` — Customer web, port `5175`
    - `nwh-mobile` — Expo mobile, port `8081`
12. Chờ backend health check (`http://127.0.0.1:3001/api/healthz`, timeout 90 giây)
13. Chờ các web port sẵn sàng
14. Mở Chrome với 3 profile window (admin, partner, customer)
15. Khởi động `nwh-db-sync` — auto export DB snapshot liên tục

Script giữ lock file `%TEMP%\nwh_running.lock` cho đến khi `stop-all.bat` chạy.

---

## 7. Các địa chỉ sử dụng

| Service | URL |
|---------|-----|
| Admin | http://localhost:5173 |
| Partner | http://localhost:5174/login |
| Customer | http://localhost:5175 |
| Backend health | http://localhost:3001/api/healthz |
| Swagger UI | http://localhost:3001/api-docs |
| Mobile (Expo) | http://localhost:8081 |

---

## 8. Dừng dự án

```powershell
.\stop-all.bat
```

Script này thực hiện:

1. Kill các tiến trình trên port `3001`, `5173`, `5174`, `5175`, `8081`
2. Kill các tiến trình liên quan (node, pnpm, vite, nest, expo)
3. Đóng các terminal window NWH (`nwh-backend`, `nwh-admin`, `nwh-partner`, `nwh-customer`, `nwh-mobile`, `nwh-db-sync`)
4. Dừng `auto_export_loop.ps1`
5. Xoá lock file `%TEMP%\nwh_running.lock`
6. Dừng container PostgreSQL (`docker compose stop postgres`)
7. Đóng Chrome window mở bởi script

---

## 9. Database

### Reset DB về snapshot mới nhất

```powershell
pnpm db:reset
```

Tương đương `node database/baseline/import.mjs` — drop toàn bộ DB và restore từ `database/snapshots/schema.sql` + `data.sql`.

### Chạy Prisma migrations

```powershell
pnpm db:migrate
```

### Export snapshot DB hiện tại

```powershell
pnpm db:export
```

Hoặc:

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

---

## Lỗi thường gặp

### Docker Desktop chưa sẵn sàng

Script tự thử start Docker Desktop. Nếu vẫn lỗi, mở thủ công và đợi Docker start xong, sau đó chạy lại:

```powershell
.\start-all.bat
```

### DATABASE_URL is required

Kiểm tra file `backend/.env` đã tồn tại và có dòng `DATABASE_URL` đúng như mục 4.

### Module "@prisma/client" has no exported member

Prisma Client chưa được generate. Chạy lại:

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

Sau đó:

```powershell
.\start-all.bat
```

### Port đã bị chiếm

Script tự kill tiến trình cũ trên các port. Nếu vẫn lỗi, kiểm tra thủ công:

```powershell
netstat -ano | findstr ":3001"
```

Tìm PID và kill:

```powershell
taskkill /PID <pid> /F
```

### Snapshot DB bị lỗi / dữ liệu sai

Reset về baseline:

```powershell
pnpm db:reset
pnpm db:migrate
```
