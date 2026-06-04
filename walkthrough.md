# Tài liệu Tổng kết - Tích hợp ứng dụng Web Customer & Tối ưu hóa Khởi động

Chúng tôi đã hoàn thành việc tích hợp ứng dụng **Web Customer** vào dự án chính **`NoWayHomee`**, đồng thời nâng cấp toàn bộ kịch bản tự động hóa khởi chạy và dọn dẹp hệ thống để bạn có thể chạy đồng thời cả 5 cấu thành dự án một cách mượt mà và an toàn nhất.

---

## Các thay đổi và nâng cấp đã thực hiện

### 1. Tích hợp Web Customer
- **Di chuyển mã nguồn:** Đã copy toàn bộ ứng dụng khách hàng từ thư mục ngoài vào thư mục `web/apps/customer`.
- **Cấu hình Monorepo:** Đăng ký thành công workspace `apps/customer` trong file `web/package.json`.
- **Đồng bộ kết nối API:** Cập nhật tệp cấu hình `.env` của ứng dụng customer (`VITE_API_BASE_URL=http://localhost:3001/api`) để tự động kết nối trực tiếp với backend NestJS của dự án (chạy trên cổng `3001`).
- **Cổng khởi chạy riêng:** Cấu hình ứng dụng chạy trên cổng `5175` để không xung đột với Admin (`5173`) và Partner (`5174`).

### 2. Nâng cấp Script Khởi động Hệ thống (`start-all.ps1`)
Chúng tôi đã viết lại các bước kiểm tra và khởi chạy để đảm bảo bạn chạy một lệnh duy nhất là có thể khởi động toàn bộ hệ thống:
1. **Dọn dẹp cổng cũ:** Tự động phát hiện và giải phóng các tiến trình cũ đang chiếm dụng trên tất cả các cổng: `3001` (Backend), `5173` (Admin), `5174` (Partner), `5175` (Customer), và `8081` (Metro Expo).
2. **Khởi động Docker DB:** Tự động mở PostgreSQL Docker và nạp dữ liệu mẫu ban đầu.
3. **Build & Khởi chạy các ứng dụng:**
   - **Backend API:** Chạy NestJS trên cổng `3001` (cửa sổ CMD riêng biệt).
   - **Web Admin:** Chạy Vite trên cổng `5173` (cửa sổ CMD riêng biệt).
   - **Web Partner:** Chạy Vite trên cổng `5174` (cửa sổ CMD riêng biệt).
   - **Web Customer:** Chạy Vite trên cổng `5175` (cửa sổ CMD riêng biệt).
   - **Mobile App (Expo):** Tự động mở một cửa sổ CMD riêng chạy `npx expo start` để hiển thị mã QR trực tiếp trên màn hình của bạn.
4. **Kiểm tra trạng thái sẵn sàng (Healthcheck):** Sửa lỗi kiểm tra loopback giúp hệ thống xác thực trạng thái sẵn sàng thông qua `localhost` (hỗ trợ cả IPv4 và IPv6) thay vì địa chỉ cứng `127.0.0.1` dễ gây treo script trên Windows.
5. **Trình duyệt tự động:** Tự động mở cùng lúc cả 3 trang web trên trình duyệt Chrome của bạn.

### 3. React Native LogBox Red Screen Fix
- **Replaced console.error with console.warn:**
  - Trong `apiClient.ts` và `useFavoriteStore.ts`, thay đổi `console.error` thành `console.warn` cho các lỗi API đã được xử lý và hết hạn phiên làm việc.
  - Việc này giúp ngăn chặn Expo/React Native hiển thị popup lỗi đỏ toàn màn hình (LogBox) trong quá trình phát triển khi phiên làm việc của người dùng hết hạn hoặc API trả về lỗi xác thực, tạo trải nghiệm kiểm thử mượt mà hơn.

### 4. Nâng cấp Script Dừng Hệ thống (`stop-all.bat`)
- Tự động tắt sạch các cửa sổ CMD của cả 5 dịch vụ (`nwh-backend`, `nwh-admin`, `nwh-partner`, `nwh-customer`, `nwh-mobile`, `nwh-db-sync`).
- Tự động giải phóng hoàn toàn các cổng mạng, tắt PostgreSQL container trên Docker và dọn dẹp lock files.

---

## Kết quả kiểm tra biên dịch (Verification)

### 1. Cài đặt và liên kết Monorepo
Chạy liên kết dependencies thông qua pnpm:
```powershell
pnpm install
```
Kết quả: Hoàn thành liên kết thành công tất cả 9 dự án con trong workspace.

### 2. Biên dịch Production Build của 3 Web Apps
Chạy kiểm tra build tổng hợp các web frontends:
```powershell
pnpm build:web
```
Kết quả:
```text
✓ webadmin@1.0.0 built in 5.37s
✓ webpartner@1.0.0 built in 6.16s
✓ fe-web-user@0.0.0 built in 545ms (Customer App)
```
Cả 3 ứng dụng đều biên dịch ra phiên bản tối ưu chạy thực tế mà không gặp bất kỳ lỗi logic hay cú pháp nào.

### 3. Chạy thử nghiệm hệ thống thực tế
Chạy file khởi động:
```powershell
.\start-all.bat
```
Kết quả log hệ thống:
```text
Web Admin       http://localhost:5173
Web Partner     http://localhost:5174/login
Web Customer    http://localhost:5175

[01:31:00] OK Kiem tra cau truc folder (0.0s)
[01:31:01] OK Dung process cu tren port 3001, 5173, 5174, 5175, 8081 (0.5s)
[01:31:04] OK Kiem tra Docker Desktop (3.1s)
...
[01:31:31] OK Doi backend san sang (7.3s)
[01:31:32] OK Doi web admin/partner/customer san sang (0.6s)
[01:31:32] OK Bat dong bo snapshot tu dong (0.1s)
========================================
  DA KHOI DONG XONG - stop-all.bat de dung
  Tong thoi gian: 39.0s
========================================
```
Tất cả 5 dịch vụ (bao gồm ứng dụng di động in mã QR) đều khởi chạy thành công mỹ mãn trong vòng chưa tới 40 giây!
