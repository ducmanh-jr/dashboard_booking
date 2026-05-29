# 🏨 Agoda Clone Backend

Backend API cho dự án **Agoda Clone / NoWayHome** - nền tảng đặt phòng trực tuyến phục vụ các phân hệ Customer, Partner/Host và Admin.

Mục tiêu của project là xây dựng một backend RESTful API bằng NestJS, có kiến trúc module rõ ràng, kết nối PostgreSQL qua Prisma ORM, hỗ trợ xác thực JWT và cung cấp tài liệu API bằng Swagger UI để frontend có thể tích hợp thuận lợi.

---

## 🚀 Công Nghệ Sử Dụng

| Công nghệ | Vai trò |
| --- | --- |
| **NestJS** | Framework backend Node.js theo kiến trúc module, hỗ trợ Dependency Injection |
| **PostgreSQL** | Cơ sở dữ liệu quan hệ chính của hệ thống |
| **Prisma** | ORM type-safe để định nghĩa schema, migration và truy vấn database |
| **Docker** | Chạy PostgreSQL local bằng container, giúp đồng bộ môi trường phát triển |
| **JWT** | Xác thực người dùng bằng access token |
| **Swagger** | Sinh tài liệu API và hỗ trợ test endpoint trực tiếp trên trình duyệt |

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Sao chép file cấu hình môi trường

```bash
cp .env.example .env
```

Trên Windows PowerShell có thể dùng:

```powershell
Copy-Item .env.example .env
```

### Bước 2: Khởi động Database bằng Docker

```bash
docker-compose up -d
```

Hoặc với Docker Compose plugin mới:

```bash
docker compose up -d
```

### Bước 3: Cài đặt thư viện

```bash
npm install
```

### Bước 4: Khởi tạo Database Schema

```bash
npx prisma migrate dev
```

Nếu cần generate lại Prisma Client:

```bash
npx prisma generate
```

### Bước 5: Chạy dự án

```bash
npm run start:dev
```

Server mặc định chạy tại:

```text
http://localhost:3000
```

---

## 📚 Tài Liệu API

Swagger UI được cấu hình tại:

```text
http://localhost:3000/api-docs
```

Tại đây có thể xem và test các API hiện có như:

- `POST /auth/register`
- `POST /auth/login`
- `GET /properties`
- `POST /bookings`

Với các API cần xác thực, đăng nhập hoặc đăng ký để lấy `accessToken`, sau đó bấm **Authorize** trong Swagger và nhập:

```text
Bearer <accessToken>
```

---

## 📁 Cấu Trúc Thư Mục

```text
backend/
├── docs/                  # Tài liệu dự án, báo cáo phase và quy chuẩn hệ thống
├── prisma/                # Prisma schema, migrations và cấu hình database
├── src/
│   ├── common/            # Guard, decorator và các thành phần dùng chung
│   ├── modules/           # Các module nghiệp vụ: auth, users, properties, bookings
│   ├── prisma/            # PrismaModule và PrismaService
│   ├── app.module.ts      # Module gốc của ứng dụng
│   └── main.ts            # Entry point, ValidationPipe và Swagger setup
├── docker-compose.yml     # PostgreSQL service chạy bằng Docker
├── package.json           # Scripts và dependencies
└── README.md              # Tài liệu hướng dẫn chạy dự án
```

### Thư mục chính

- **`src/modules`**: Chứa các module theo từng nghiệp vụ. Hiện có `auth`, `users`, `properties`, `bookings`.
- **`src/common`**: Chứa thành phần dùng chung như `JwtAuthGuard` và `@Public()`.
- **`src/prisma`**: Chứa `PrismaService` và `PrismaModule` dùng để kết nối database.
- **`prisma`**: Chứa `schema.prisma` và migration database.
- **`docs`**: Chứa tài liệu kiến trúc, quy chuẩn và báo cáo phát triển.

---

## 🧪 Lệnh Kiểm Tra Hữu Ích

```bash
npm run build
npm run lint
npm run format
npx prisma validate
```

