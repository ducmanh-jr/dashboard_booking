# THÔNG TIN DỰ ÁN CỐT LÕI

- **Tên dự án:** NoWayHome
- **Mô tả:** Nền tảng đặt phòng trực tuyến (Agoda clone).
- **Mục tiêu:** Đồ án đại học, yêu cầu nghiêm ngặt về Clean Code, System Design, Security và Performance (sẵn sàng cho Production).

# PHÂN HỆ HỆ THỐNG (MODULES)

1. **Customer App (Mobile):** Tìm kiếm phòng, booking, thanh toán, quản lý profile.
2. **Partner/Host Portal (Web):** Quản lý inventory (phòng, lịch trống), cài đặt giá, quản lý booking, thống kê doanh thu.
3. **Admin Dashboard (Web):** Kiểm duyệt host, quản lý user, audit rủi ro hệ thống, config fee/cấu hình chung.

# CÔNG NGHỆ BẮT BUỘC (TECH STACK)

Tuyệt đối KHÔNG đề xuất hoặc sử dụng các công nghệ ngoài danh sách này nếu không có sự cho phép.

- **Web Frontend (Admin & Partner):** ReactJS, TypeScript, Vite, TailwindCSS. State management: Zustand hoặc RTK Query (tùy ngữ cảnh).
- **Mobile App (Customer):** React Native, Expo, Expo Router (file-based routing), TypeScript.
- **Backend:** NestJS (Node.js framework). Sử dụng RESTful API làm mặc định, chỉ dùng GraphQL khi client có nhu cầu query data phức tạp có tính liên kết cao.
- **Database:** PostgreSQL Docker + DBeaver.
- **ORM:** Prisma.
- **Security:** JWT (Access/Refresh Token mechanism), RBAC (Role-Based Access Control - Customer, Host, Admin), bcrypt/argon2 hashing.

# INTEGRATION CONTRACT - NOWAYHOME

**Mục tiêu:** Quy định các giao thức giao tiếp, đồng bộ dữ liệu và luồng xác thực giữa 3 phân hệ: Customer (Mobile), Partner/Admin (Web) và Core System (Backend). Mọi AI Agent thao tác trên dự án phải tuân thủ nghiêm ngặt file này.

## 1. SINGLE SOURCE OF TRUTH (NGUỒN CHÂN LÝ)

- Backend (NestJS) là nguồn chân lý duy nhất cho toàn bộ Entity Schema.
- Frontend (React/React Native) KHÔNG ĐƯỢC PHÉP tự định nghĩa `interface` hoặc `type` thủ công cho các API Response/Request.
- **Quy trình bắt buộc:** Backend tự động sinh tài liệu Swagger UI. Frontend sử dụng tool gen type từ file `swagger-spec.json` của Backend để đảm bảo đồng bộ 100%.

## 2. CHUẨN GIAO TIẾP DỮ LIỆU (RESTFUL)

- **Casing:** Mọi JSON Request/Response bắt buộc dùng `camelCase`. Backend có trách nhiệm map sang `snake_case` khi giao tiếp với DB nếu cần, client không quan tâm.
- **Date/Time:** Mọi trường ngày tháng BẮT BUỘC gửi/nhận dưới định dạng chuẩn **ISO 8601 UTC** (VD: `2026-05-20T14:30:00.000Z`). Frontend tự convert ra local timezone khi hiển thị.
- **Pagination Response Format:** API trả về danh sách bắt buộc theo cấu trúc:

  ```json
  {
    "data": [ ... ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }

  ```

## 3. CHUẨN XỬ LÝ LỖI (GLOBAL ERROR HANDLING)

- Các lỗi 4xx, 5xx từ Backend luôn trả về cấu trúc đồng nhất:

```JSON
{
  "statusCode": 400,
  "errorCode": "BOOKING_DATE_CONFLICT", // Enum string, Frontend dùng mã này để dịch ra text
  "message": "Phòng đã được đặt trong thời gian này", // Text mặc định
  "details": null
}
```

- Frontend bắt buộc dùng **Axios Interceptors** để handle Global Error. Không viết `try/catch` bắt lỗi hiển thị Toast ở từng hàm fetch riêng lẻ.

## 4. LUỒNG XÁC THỰC (AUTHENTICATION FLOW) BẮT BUỘC

Xác thực sử dụng JWT (Access Token 15 phút, Refresh Token 7 ngày). Cần phân tách rõ luồng do đặc thù nền tảng:

**4.1. Đối với Web (Admin & Partner):**

- Backend gửi **Refresh Token** ngầm qua Header `Set-Cookie` (thuộc tính: `HttpOnly`, `Secure`, `SameSite=Strict`).
- Backend trả **Access Token** qua JSON body.
- Web Client lưu Access Token trên Memory (Zustand) hoặc local variable. Tuyệt đối không lưu vào `localStorage`.

**4.2. Đối với Mobile (Customer - Expo):**

- Không dùng Cookie. Backend trả CẢ **Access Token** và **Refresh Token** qua JSON body.
- Mobile Client lưu CẢ 2 token vào `SecureStore` (expo-secure-store). Không dùng `AsyncStorage`.

**4.3. Auto-Refresh Token:**

- Axios Interceptor ở client phải tự động bắt lỗi `401 Unauthorized`.
- Khi dính 401, client đẩy request vào hàng đợi, gọi API `/auth/refresh` để cấp lại Access Token mới, sau đó tự động retry các request đang treo. Nếu refresh thất bại, logout user.

## 5. XỬ LÝ MEDIA VÀ UPLOAD

- Tuyệt đối không truyền file ảnh dạng Base64 qua REST API.
- Frontend phải nén ảnh (compress) trước khi thao tác.
- **Upload flow:**
  1. Frontend gọi API xin Pre-signed URL từ Backend.
  2. Backend cấp Pre-signed URL (Cloudinary hoặc S3).
  3. Frontend PUT file trực tiếp lên Cloud provider bằng URL đó.
  4. Frontend lấy được final URL từ Cloud, gửi kèm URL này vào payload create/update entity cho Backend lưu DB.

## 6. KIỂM SOÁT ĐỒNG THỜI (CONCURRENCY)

- Khi gọi các API tạo Booking hoặc thanh toán, Frontend BẮT BUỘC phải handle trạng thái `loading`, disable button submit ngay lập tức để chống duplicate request.
- Backend sử dụng Database Transaction + Row Locking (VD: `SELECT ... FOR UPDATE` trong PostgreSQL) để tránh Race Condition khi 2 khách hàng đặt cùng một phòng vào cùng một thời điểm.
