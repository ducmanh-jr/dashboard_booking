# Hướng dẫn nạp Dữ liệu & Chạy dự án (Dành cho Người dùng B)

Chào bạn! Đây là hướng dẫn nhanh để bạn có thể chạy dự án này trên máy cá nhân với đầy đủ dữ liệu mới nhất.

## Bước 1: Tạo Database trống (Bắt buộc)
Backend cần kết nối được vào database để tự động nạp dữ liệu. Bạn hãy tạo một database tên là `agoda_clone` trên MySQL của mình:
```sql
CREATE DATABASE IF NOT EXISTS agoda_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Bước 2: Cấu hình kết nối (.env)
Tạo file `.env` ở thư mục gốc (hoặc `backend/.env`) với thông tin MySQL của bạn:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mật_khẩu_của_bạn
DB_NAME=agoda_clone
```

## Bước 3: Nạp dữ liệu & Khởi động
Bạn có 2 cách để bắt đầu:

*   **Cách 1 (Tự động)**: Chạy `start-all.bat`. Backend sẽ thấy DB trống và tự nạp toàn bộ dữ liệu từ snapshot.
*   **Cách 2 (Chủ động - Khuyên dùng)**: Chạy lệnh sau để đảm bảo DB được reset sạch sẽ và nạp bản mới nhất từ User A:
    ```bash
    pnpm db:reset:latest
    ```

## Bước 4: Cách cập nhật dữ liệu khi có bản mới
Mỗi khi User A gửi bản cập nhật code mới, bạn chỉ cần chạy lại lệnh:
```bash
pnpm db:reset:latest
```
Hệ thống sẽ tự động cập nhật cấu trúc và dữ liệu mới nhất mà không cần thao tác gì thêm.

---
**Chúc bạn thực hiện thành công!**
