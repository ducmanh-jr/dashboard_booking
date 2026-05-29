# Hướng dẫn chạy dự án sau khi tải về

Tài liệu này dành cho máy Windows chạy local stack của Nowayhome.

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

Nếu `docker --version` có kết quả nhưng Docker chưa chạy, hãy mở Docker Desktop trước khi start dự án.

## 2. Mở thư mục dự án

Đi vào thư mục gốc của dự án:

```powershell
cd dashboard_booking
```

## 3. Cài dependencies

Chạy lệnh:

```powershell
pnpm install
```

## 4. Tạo file môi trường cho backend

Nếu chưa có file `backend/.env`, tạo file này bằng nội dung:

```env
DATABASE_URL="postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
JWT_ACCESS_SECRET="change_me_access_secret"
JWT_REFRESH_SECRET="change_me_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
```

## 5. Generate Prisma Client

Chạy lệnh này sau khi cài dependencies:

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

## 6. Chạy toàn bộ hệ thống

Chạy:

```powershell
.\start-all.bat
```

Script sẽ tự động:

- Dừng các service cũ trên port `3001`, `5173`, `5174`
- Khởi động PostgreSQL bằng Docker
- Nạp lại database snapshot
- Build backend
- Chạy backend, admin và partner web

## 7. Các địa chỉ sử dụng

- Admin: http://localhost:5173
- Partner: http://localhost:5174/login
- Backend health: http://localhost:3001/api/healthz

## 8. Dừng dự án

Chạy:

```powershell
.\stop-all.bat
```

Lệnh này sẽ dừng backend, các Vite server và PostgreSQL container của dự án.

## Lỗi thường gặp

### Docker Desktop chưa sẵn sàng

Nếu gặp lỗi Docker chưa sẵn sàng, mở Docker Desktop và đợi đến khi Docker start xong, sau đó chạy lại:

```powershell
.\start-all.bat
```

### DATABASE_URL is required

Kiểm tra file `backend/.env` đã tồn tại chưa và có dòng `DATABASE_URL` đúng như mục 4 không.

### Module "@prisma/client" has no exported member

Thường do Prisma Client chưa được generate. Chạy lại:

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

Sau đó chạy lại:

```powershell
.\start-all.bat
```
