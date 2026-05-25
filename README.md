# NoWayHome Dashboard Booking

NoWayHome Dashboard Booking là hệ thống quản lý đặt phòng khách sạn chạy local, gồm backend API, cơ sở dữ liệu PostgreSQL, hai ứng dụng web cho quản trị viên và đối tác khách sạn, kèm bộ công cụ nhập dữ liệu khách sạn.

Dự án được tổ chức theo monorepo dùng `pnpm workspace`. Stack chính hiện tại là:

- `backend/`: NestJS API, Prisma ORM, PostgreSQL, JWT, Swagger.
- `web/apps/admin`: dashboard quản trị hệ thống.
- `web/apps/partner`: dashboard dành cho đối tác/chủ khách sạn.
- `database/`: snapshot, baseline, script reset/export database.
- `tools/hotel-importer`: công cụ hỗ trợ tạo dữ liệu khách sạn từ Agoda URL.
- `core_api/`: API ASP.NET Core phụ trợ/legacy để tham chiếu hoặc kiểm thử riêng.

## Chức năng chính

### Admin

Ứng dụng admin dùng cho quản trị viên hệ thống:

- Xem tổng quan doanh thu, booking và dữ liệu vận hành.
- Quản lý đối tác/khách sạn.
- Quản lý khách hàng.
- Quản lý phòng và booking.
- Quản lý tài khoản admin.
- Theo dõi thông báo.
- Duyệt trạng thái KYC, trạng thái khách sạn và các nghiệp vụ quản trị khác.

### Partner

Ứng dụng partner dùng cho đối tác khách sạn:

- Đăng nhập vào dashboard đối tác.
- Xem tổng quan tình hình phòng và booking.
- Quản lý danh sách phòng.
- Tạo, chỉnh sửa và xem chi tiết phòng.
- Theo dõi booking.
- Xem thông báo liên quan đến khách sạn/phòng.

### Backend API

Backend chính nằm trong `backend/`, xây dựng bằng NestJS:

- Xác thực bằng JWT access token và refresh token.
- Phân quyền theo vai trò bằng guard và decorator.
- Module nghiệp vụ: `auth`, `users`, `admin`, `properties`, `partner`, `bookings`, `reviews`, `compat`.
- Prisma kết nối PostgreSQL.
- Swagger tự sinh tài liệu API tại `/api-docs`.
- Global validation pipe, exception filters và response transform interceptor.
- Cache in-memory mặc định, có thể bật Redis bằng biến môi trường.

### Database

Database dùng PostgreSQL chạy bằng Docker:

- Container mặc định: `nowayhome-postgres`.
- Database mặc định: `nowayhome`.
- User/password mặc định: `nowayhome` / `nowayhome`.
- Snapshot schema/data nằm trong `database/snapshots/`.
- Script reset database nằm trong `database/baseline/`.
- Prisma schema và migration chính nằm trong `backend/prisma/`.

## Cấu trúc thư mục

```text
.
+-- backend/                         # Backend NestJS + Prisma
|   +-- src/
|   |   +-- common/                   # Guard, filter, decorator, interceptor dùng chung
|   |   +-- config/                   # Validate biến môi trường
|   |   +-- modules/                  # Module nghiệp vụ
|   |   +-- prisma/                   # PrismaModule và PrismaService
|   |   +-- app.module.ts
|   |   +-- main.ts
|   +-- prisma/                       # Prisma schema, migrations, seed
|   +-- docs/                         # Tài liệu backend và SQL tham chiếu
|   +-- docker-compose.yml            # PostgreSQL local
|   +-- .env.example
|   +-- package.json
|
+-- web/                             # Frontend monorepo
|   +-- apps/
|   |   +-- admin/                    # Web admin, port 5173
|   |   +-- partner/                  # Web partner, port 5174
|   +-- packages/
|   |   +-- api-client/               # Fetch client dùng chung
|   |   +-- auth-ui/                  # UI xác thực dùng chung
|   +-- package.json
|
+-- database/
|   +-- baseline/                     # Reset/import database từ snapshot
|   +-- migrations/                   # SQL migration tham chiếu
|   +-- scripts/                      # Tool PostgreSQL dùng chung
|   +-- snapshots/                    # schema.sql và data.sql
|
+-- tools/
|   +-- hotel-importer/               # Tool import dữ liệu khách sạn
|
+-- core_api/                         # ASP.NET Core API phụ trợ/legacy
+-- start-all.ps1                     # Script khởi động full stack trên Windows
+-- start-all.bat                     # Wrapper chạy start-all.ps1
+-- stop-all.bat                      # Dừng full stack
+-- pnpm-workspace.yaml
+-- package.json
```

## Công nghệ sử dụng

| Phần | Công nghệ |
| --- | --- |
| Backend chính | NestJS 11, TypeScript, Prisma 6 |
| Database | PostgreSQL 16, Docker Compose |
| Auth | JWT, Passport JWT, bcrypt |
| API Docs | Swagger/OpenAPI |
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router |
| UI/Chart | Tailwind CSS 4, Lucide React, Recharts |
| Workspace | pnpm workspace |
| API legacy/phụ trợ | ASP.NET Core, EF Core, Npgsql |

## Yêu cầu cài đặt

Cần cài sẵn:

- Node.js.
- pnpm.
- Docker Desktop.
- Git.

Kiểm tra nhanh:

```powershell
node --version
pnpm --version
docker --version
git --version
```

Nếu Docker CLI có nhưng Docker daemon chưa sẵn sàng, hãy mở Docker Desktop trước khi chạy dự án.

## Cài đặt lần đầu

Tại thư mục gốc dự án:

```powershell
pnpm install
```

Tạo file môi trường cho backend nếu chưa có:

```powershell
Copy-Item backend\.env.example backend\.env
```

Nội dung mặc định của `backend/.env`:

```env
DATABASE_URL="postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
JWT_ACCESS_SECRET="change_me_access_secret"
JWT_REFRESH_SECRET="change_me_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
```

Generate Prisma Client:

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

## Chạy toàn bộ hệ thống

Cách nhanh nhất trên Windows:

```powershell
.\start-all.bat
```

Script này sẽ:

- Dừng process cũ trên các port `3001`, `5173`, `5174`.
- Kiểm tra và khởi động Docker Desktop nếu cần.
- Khởi động PostgreSQL bằng `backend/docker-compose.yml`.
- Reset database và nạp snapshot mới nhất từ `database/snapshots/`.
- Build backend.
- Chạy backend, admin web và partner web.
- Mở trình duyệt tới admin và partner.
- Bật tiến trình auto-export snapshot database.

Dừng toàn bộ hệ thống:

```powershell
.\stop-all.bat
```

## URL local

| Thành phần | URL |
| --- | --- |
| Admin web | `http://localhost:5173` |
| Partner web | `http://localhost:5174/login` |
| Backend health check | `http://localhost:3001/api/healthz` |
| Swagger API docs | `http://localhost:3001/api-docs` |
| PostgreSQL | `localhost:5432` |

## Chạy từng phần thủ công

Khởi động PostgreSQL:

```powershell
docker compose -f backend\docker-compose.yml up -d postgres
```

Reset database từ snapshot:

```powershell
pnpm db:reset
```

Chạy migration Prisma nếu cần:

```powershell
pnpm db:migrate
```

Build và chạy backend:

```powershell
pnpm --filter backend run build
pnpm --filter backend start:prod
```

Chạy admin web:

```powershell
pnpm --filter webadmin dev
```

Chạy partner web:

```powershell
pnpm --filter webpartner dev
```

## Lệnh thường dùng

```powershell
pnpm install
pnpm build:web
pnpm db:migrate
pnpm db:reset
pnpm db:export
pnpm --filter backend run build
pnpm --filter nowayhome-web run typecheck
pnpm --filter webadmin build
pnpm --filter webpartner build
```

## Quy trình database

Snapshot hiện tại của database nằm ở:

- `database/snapshots/schema.sql`
- `database/snapshots/data.sql`

Export lại snapshot sau khi thay đổi dữ liệu:

```powershell
powershell -ExecutionPolicy Bypass -File database\snapshots\export.ps1
```

Reset database về snapshot:

```powershell
pnpm db:reset
```

Schema nguồn của hệ thống vẫn là Prisma:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`

Khi thay đổi schema thật, nên tạo Prisma migration trước, sau đó export snapshot để người khác có thể chạy lại cùng trạng thái dữ liệu.

## Tool Hotel Importer

Tool import dữ liệu khách sạn nằm trong `tools/hotel-importer`. Tool này tách khỏi code chính, dùng để tạo hoặc review SQL khách sạn từ Agoda URL.

Chạy giao diện:

```powershell
pnpm --filter hotel-importer-tool start
```

Mở:

```text
http://localhost:4317
```

Các output quan trọng:

- `tools/hotel-importer/output/import-report.json`
- `tools/hotel-importer/output/import-preview.sql`
- `tools/hotel-importer/output/saved/apply.sql`
- `tools/hotel-importer/output/store/`
- `tools/hotel-importer/output/approved/`

## API ASP.NET Core phụ trợ

Thư mục `core_api/` chứa API ASP.NET Core phụ trợ/legacy. Đây không phải backend chính được `start-all.bat` khởi động, nhưng có thể chạy riêng khi cần kiểm thử hoặc đối chiếu.

Chạy local:

```powershell
cd core_api
dotnet run
```

Chạy test:

```powershell
dotnet test core_api.Tests\core_api.Tests.csproj
```

## Ghi chú phát triển

- Dùng `pnpm` nhất quán vì repo cấu hình `pnpm-workspace.yaml`.
- Không commit `node_modules`, `dist`, log hoặc file môi trường thật.
- Khi thêm API frontend, nên đặt path trong `constants/apiPaths.ts` và tạo hàm gọi API trong `src/api`.
- Khi thêm màn hình frontend, nên tách theo `features/`.
- Backend mặc định có global prefix `/api`, vì vậy endpoint nghiệp vụ sẽ có dạng `/api/...`.
- Swagger nằm ngoài prefix `/api`, tại `/api-docs`.
- `start-all.bat` ưu tiên snapshot database hiện tại; hãy export snapshot khi muốn chia sẻ dữ liệu mới cho người khác.

## Tài liệu liên quan

- `HUONG_DAN_CHAY_DU_AN.md`: hướng dẫn chạy local chi tiết cho Windows.
- `backend/README.md`: tài liệu backend NestJS.
- `web/README.md`: tài liệu frontend monorepo.
- `database/README.md`: quy trình snapshot/reset/export database.
- `tools/hotel-importer/README.md`: hướng dẫn tool import khách sạn.
- `backend/docs/SYSTEM.md`: mô tả hệ thống backend.
