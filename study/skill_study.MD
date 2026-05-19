# 🧠 PHƯƠNG PHÁP HỌC TẬP TƯƠNG TÁC (INTERACTIVE LEARNING RULES)

Tài liệu này ghi nhớ **Quy tắc thiết kế và Biên soạn tài liệu học tập** độc quyền trong thư mục `study/` của dự án **Nowayhome Dashboard**. 

Bất kỳ AI Assistant nào tham gia hỗ trợ dự án này (hoặc chính bạn khi viết ghi chú) **phải tuân thủ nghiêm ngặt** các tiêu chuẩn điều hướng dưới đây để đảm bảo việc học tập và đọc hiểu code trực quan, nhanh chóng nhất.

---

## 📌 QUY TẮC VÀNG VỀ LIÊN KẾT ĐIỀU HƯỚNG (NAVIGATION RULES)

### 1. Luôn sử dụng Đường dẫn tương đối (Relative Paths)
* ❌ **Không dùng:** Đường dẫn tuyệt đối dạng `file:///c:/Users/Admin/...` vì bộ đọc Markdown Preview của VS Code sẽ khóa link do bảo mật, hoặc gây lỗi khi chạy trên máy khác.
* 🟢 **Bắt buộc dùng:** Đường dẫn tương đối bắt đầu bằng `./` hoặc `../` tính từ thư mục chứa file markdown.
  * *Ví dụ:* `[PartnersTab.tsx](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx)`

### 2. Luôn đính kèm Số dòng chính xác (`#L...`)
* ❌ **Không dùng:** Chỉ dẫn chung chung như "hãy mở file `PartnersTab.tsx` rồi tìm nút Approve".
* 🟢 **Bắt buộc dùng:** Đính kèm trực tiếp số dòng hoặc khoảng dòng của code thực tế vào cuối đường dẫn để VS Code kích hoạt tính năng **nhảy thẳng tới dòng code**.
  * *Cú pháp:* `../path/to/file.tsx#L<dòng_bắt_đầu>-L<dòng_kết_thúc>`
  * *Ví dụ thực tế:* `[PartnersTab.tsx: Dòng 276](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx#L276)`

### 3. Giao diện ghi chú Tiếng Việt thân thiện
* Mọi liên kết mở nhanh phải được ghi chú rõ ràng bằng tiếng Việt, giúp người học nhận biết ngay hành động click sẽ đưa họ tới dòng code làm nhiệm vụ gì.
  * *Cú pháp chuẩn:* `* **Đường dẫn mở nhanh (Nhấp để nhảy thẳng tới dòng code):** [TênFile: Mô tả dòng dòng_số](đường_dẫn_tương_đối#Ldòng_số)`

### 4. Giải thích chi tiết từng dòng code (Deep-dive Explanation)
* ❌ **Không dùng:** Chỉ đưa ra đoạn code hoặc vị trí code rồi giải thích chung chung đại khái về chức năng của cả khối.
* 🟢 **Bắt buộc dùng:** Phải có mục **"Giải thích chi tiết từng dòng code"** ngay bên dưới. Mổ xẻ chi tiết ý nghĩa, cú pháp và vai trò của **từng dòng lệnh quan trọng** (dùng gạch đầu dòng). Phải giải thích cặn kẽ các khái niệm về thư viện (ví dụ: `useMutation`, `invalidateQueries`) hoặc framework (ví dụ: `req`, `res`, `next`) để người học hiểu tận gốc "tại sao hệ thống lại được viết như vậy".

---

## 🛠️ HƯỚNG DẪN DÀNH CHO NGƯỜI HỌC (HOW TO USE)

Khi đọc bất kỳ tài liệu học tập nào trong thư mục `study/` (ví dụ `01_overview_architecture.md`, `02_admin_approve_partner.md`), bạn có hai cách để điều hướng siêu tốc:

1. **Trong Chế độ Đọc Code (Raw Editor):**
   * Nhấn giữ phím **`Ctrl`** (trên Windows/Linux) hoặc **`Cmd`** (trên macOS).
   * **Click chuột trái** vào liên kết tương ứng. VS Code sẽ lập tức mở file mục tiêu và bôi xanh dòng code đó.

2. **Trong Chế độ Xem trước Markdown (Markdown Preview):**
   * Bạn chỉ cần **click chuột trái trực tiếp** vào liên kết. Hệ thống sẽ tự động chuyển trang và đưa bạn đến dòng code chỉ định.

---

## 📋 DANH SÁCH BÀI HỌC ĐÃ THIẾT LẬP (LEARNING INDEX)

* 🗺️ **Lộ trình học tập tổng quan:** [study_plan.md](./study_plan.md)
* 🏛️ **Kiến trúc vĩ mô & Luồng dữ liệu:** [01_overview_architecture.md](./01_overview_architecture.md)
* 🔍 **Phân tích luồng Admin Duyệt Đối Tác:** [02_admin_approve_partner.md](./02_admin_approve_partner.md)

*Tài liệu này được tạo ra để lưu giữ tri thức và phương pháp học tập tốt nhất cho bạn!*
