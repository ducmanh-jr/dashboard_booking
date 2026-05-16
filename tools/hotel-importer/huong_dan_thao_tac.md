# Hướng dẫn sử dụng Hotel Importer Tool

Công cụ này giúp bạn tự động lấy dữ liệu từ Agoda để nạp vào hệ thống Nowayhome. Dưới đây là các bước thao tác chi tiết:

## 1. Khởi động công cụ
Mở terminal tại thư mục gốc dự án và chạy:
```bash
cd tools/hotel-importer
pnpm start
```
Sau đó, truy cập vào địa chỉ: [http://localhost:4317](http://localhost:4317)

## 2. Quy trình thu thập dữ liệu (4 Bước)

### Bước 4: Nạp vào hệ thống (Quy trình 1-Click)
Hệ thống sẽ tự động thực hiện:

1.  **Thực thi SQL trực tiếp**: Tự động chạy lệnh vào Database `agoda_clone` mà không cần mở MySQL Workbench.
2.  **Đồng bộ Team**: Tự động cập nhật lại file `database/snapshots/data.sql`. Bạn chỉ cần đẩy code lên là cả team sẽ có dữ liệu mới.

---
**Lưu ý:**
- SQL có tính **idempotent**: Nạp lại nhiều lần vẫn an toàn.
- Sau khi Apply thành công, tool sẽ tự dọn dẹp file tạm để chuẩn bị cho lần quét sau.
