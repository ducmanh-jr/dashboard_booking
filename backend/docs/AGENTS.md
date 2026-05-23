# THÔNG TIN DỰ ÁN CỐT LÕI

- **Tên dự án:** NoWayHome
- **Mô tả:** Nền tảng đặt phòng trực tuyến (Agoda clone).
- **Phân hệ chính:** Customer (Mobile), Partner/Host (Web), Admin (Web).
- **Mục tiêu Repository này:** Chỉ xử lý Backend API, Database và logic nghiệp vụ.

# BACKEND TECH STACK (STRICT)

- **Framework:** NestJS (Node.js).
- **Database:** PostgreSQL Docker + DBeaver
- **ORM:** Prisma
- **Security:** JWT (Access/Refresh Token), Argon2 (hashing), RBAC (Role-Based Access Control).

# HOW TO RUN & DEV COMMANDS

AI Agent khi cần thực thi lệnh, sử dụng các script sau:

- Khởi tạo DB local (nếu có docker-compose): `docker-compose up -d`
- Install: `npm install`
- Dev server: `npm run start:dev`
- Prisma Migrate: `npx prisma migrate dev`
- Prisma Studio: `npx prisma studio`
- Lint: `npm run lint`

# QUY TẮC CỐT LÕI CHO AI AGENT (WIND SURF / CURSOR)

TUYỆT ĐỐI tuân thủ các quy tắc sau khi phân tích hoặc viết code:

## 1. Thái độ & Tương tác

- KHÔNG giải thích dài dòng, KHÔNG chào hỏi. Đưa ra nguyên nhân lỗi và giải pháp ngay lập tức.
- Luôn phản biện: Nếu user yêu cầu một logic thiếu an toàn (vd: xóa user thay vì soft-delete, không check ID của resource khi update), PHẢI cảnh báo và từ chối, cung cấp code chuẩn bảo mật.

## 2. Tiêu chuẩn Kiến trúc & Design Pattern

- Áp dụng triệt để Dependency Injection (DI) của NestJS.
- Tổ chức code theo Module. Không nhồi nhét logic vào Controller. Controller chỉ làm nhiệm vụ điều phối và validate request. Mọi nghiệp vụ nằm ở Service.
- Sử dụng Custom Decorators cho các tác vụ lặp lại (vd: `@CurrentUser()`).

## 3. Database & Hiệu năng (PostgreSQL + Prisma)

- Không bao giờ query toàn bộ bảng (`findMany` không giới hạn). Bắt buộc phải có Pagination (Limit/Offset) đối với các API get list.
- Giải quyết triệt để bài toán N+1 Query. Prisma sử dụng `include` hoặc `select` phải tối ưu, chỉ lấy các field cần thiết.
- Các API thanh toán, thay đổi trạng thái booking, giải ngân: BẮT BUỘC dùng Database Transactions (Prisma Interactive Transactions) để tránh Race Condition.

## 4. Bảo mật & Validation

- Mọi Input Payload phải được validate bằng `class-validator` và `class-transformer` tại DTO. Bật `whitelist: true` và `forbidNonWhitelisted: true` trong ValidationPipe.
- Mật khẩu phải hash bằng Argon2 hoặc bcrypt, không bao giờ return chuỗi hash ra ngoài API.
- Các API yêu cầu xác thực phải được bảo vệ bởi `JwtAuthGuard`. Phân quyền sử dụng `RolesGuard`.
- Access Token có thời hạn ngắn (15-30m), Refresh Token lưu an toàn và có cơ chế revoke khi cần.

## 5. Xử lý lỗi (Error Handling)

- Không ném trực tiếp lỗi 500 (Internal Server Error) ra client kèm stack trace.
- Sử dụng Global Exception Filter của NestJS để format lỗi về dạng chuẩn (vd: `{ "statusCode": 400, "message": "...", "error": "..." }`).
- Handle rõ ràng các lỗi từ Database (vd: Prisma Unique Constraint Violation) để trả về HTTP 409 Conflict thay vì 500.
