# Database Sharing Strategy — Thiết kế & Ý tưởng

> Tài liệu này trình bày toàn bộ ý tưởng, mục tiêu, công cụ và cơ chế hoạt động của hệ thống quản lý & chia sẻ database trong dự án `nowayhome-dashboard`.

---

## 1. Ý tưởng cốt lõi

Vấn đề phổ biến trong team development:

- Thành viên A làm việc, thêm dữ liệu vào DB local.
- Thành viên B clone repo về — DB **trống hoàn toàn**, phải tự import thủ công, dễ sai version.
- Không ai biết DB hiện tại của người khác trông như thế nào.
- Schema thay đổi nhưng không ai thông báo → conflict, lỗi runtime.

**Ý tưởng giải pháp:** Biến Git repository thành nguồn sự thật duy nhất (*single source of truth*) cho cả **schema lẫn dữ liệu**. Hệ thống tự động:

1. **Export** trạng thái DB thực tế → commit vào repo.
2. **Import** tự động khi người mới khởi động hệ thống lần đầu.
3. **Migrate** các thay đổi schema theo thứ tự có kiểm soát.

Không cần công cụ ngoài, không cần database server chung, không cần hướng dẫn thủ công phức tạp.

---

## 1.1 Yêu cầu phía Developer B (người mới clone)

Để hệ thống auto-bootstrap hoạt động, Developer B cần đảm bảo **đúng 2 điều kiện** trước khi chạy dự án:

---

### Điều kiện 1 — Database `agoda_clone` phải tồn tại trên máy

Hệ thống **không tự tạo database**, chỉ tự nạp bảng và dữ liệu vào database đã có.

**Trường hợp A — Đã từng chạy dự án trước đó (database đã có sẵn):**

Nếu `agoda_clone` đã xuất hiện trong danh sách → **không cần làm gì thêm**, sang Điều kiện 2.

---

**Trường hợp B — Máy chưa có database `agoda_clone` (lần đầu tiên):**

Chạy file baseline để tạo database + toàn bộ bảng từ đầu:

Mở Mysql chạy file `baseline/3.8.sql`


Script sẽ yêu cầu gõ `RESET` để xác nhận. Sau khi hoàn tất, database `agoda_clone` sẽ được tạo với đầy đủ bảng.

> **Lưu ý:** Nếu sau này chạy dự án và hệ thống tự bootstrap từ `snapshots/`, dữ liệu trong baseline có thể bị thay thế bởi snapshot mới hơn từ repo. Đây là hành vi mong muốn — snapshot luôn mới hơn baseline.

---

### Điều kiện 2 — Điền đúng thông tin kết nối vào `.env`

Tạo file `.env` ở thư mục gốc (hoặc `backend/.env`) với thông tin MySQL **trên máy của bạn**:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mật_khẩu_mysql_của_bạn
DB_NAME=agoda_clone
```

> **Quan trọng:** `DB_PASSWORD` phải khớp với mật khẩu MySQL trên máy bạn. Nếu MySQL local không có mật khẩu, để trống: `DB_PASSWORD=`

Mẫu file `.env` đầy đủ xem tại `.env.example` trong thư mục gốc dự án.

---

### Sau khi đáp ứng 2 điều kiện trên

```powershell
npm run dev
```

Hệ thống sẽ tự động:
1. Kết nối DB bằng thông tin trong `.env`.
2. Kiểm tra DB có trống không.
3. Nếu trống → nạp `snapshots/schema.sql` + `snapshots/data.sql`.
4. Chạy toàn bộ migration trong `migrations/`.
5. Khởi động server bình thường.

**Không cần làm thêm bước nào.**

---

## 2. Mục tiêu

| # | Mục tiêu | Kết quả kỳ vọng |
|---|-----------|-----------------|
| 1 | **Zero-setup onboarding** | Clone repo + `npm run dev` → DB đầy đủ, sẵn sàng làm việc |
| 2 | **Luôn đồng bộ với thực tế** | DB được snapshot định kỳ tự động, không cần can thiệp thủ công |
| 3 | **Kiểm soát thay đổi schema** | Mọi thay đổi cấu trúc đều được lưu vết qua migration file |
| 4 | **Rollback an toàn** | Có baseline gốc để reset về trạng thái ban đầu bất cứ lúc nào |
| 5 | **Không phụ thuộc hạ tầng chung** | Mỗi developer chạy DB local, không dùng DB server chung dễ hỏng |
| 6 | **Tài liệu hóa tự động** | File SQL trong repo chính là tài liệu sống của schema |

---

## 3. Công cụ sử dụng

### 3.1 Node.js (ESM) — `snapshots/export.mjs`
- **Vai trò:** Engine export chính. Kết nối trực tiếp DB qua `mysql2/promise`, truy vấn `SHOW CREATE TABLE` và `SELECT *`, sinh ra file SQL chuẩn.
- **Ưu điểm:** Không cần cài thêm bất kỳ binary nào ngoài Node.js vốn đã có trong dự án. Logic xử lý type (Date, Buffer, BigInt, NULL) được kiểm soát hoàn toàn trong code.

### 3.2 PowerShell — `baseline/import.ps1`, `snapshots/export.ps1`
- **Vai trò:** Wrapper script để developer chạy thủ công trên Windows.
- **Ưu điểm:** Có sẵn trên mọi máy Windows 10+. Đọc `.env` để không cần nhập credential thủ công.

### 3.3 MySQL CLI — `mysql` binary
- **Vai trò:** Thực thi file SQL baseline (`3.8.sql`) khi import thủ công.
- **Lý do không dùng cho bootstrap tự động:** `mysql` CLI phải được cài riêng. Node.js + `mysql2` luôn có sẵn trong dự án → ưu tiên hơn.

### 3.4 `mysql2/promise` (npm package)
- **Vai trò:** Driver MySQL cho Node.js. Dùng trong cả export (`export.mjs`) và bootstrap/migration (`databaseBootstrap.js`, `databasePatches.js`).
- **Lý do chọn:** Hỗ trợ Promise/async-await native, `multipleStatements`, stream — phù hợp cho cả export lẫn import file SQL lớn.

### 3.5 Git
- **Vai trò:** Transport layer. `schema.sql` và `data.sql` được commit vào repo → trở thành phương tiện truyền tải trạng thái DB giữa các developer.
- **Không cần server riêng:** Tận dụng infrastructure Git đã có (GitHub, GitLab, v.v.).

---

## 4. Cách hoạt động

### 4.1 Luồng Export (Developer A — người làm việc)

```
[DB thực tế trên máy A]
        │
        ▼
  dataSyncScheduler.js          ← chạy định kỳ (mặc định mỗi 5 phút)
        │
        ▼
  snapshots/export.mjs
    ├── SHOW FULL TABLES
    ├── SHOW CREATE TABLE <each>  → schema.sql
    └── SELECT * FROM <each>      → data.sql
        │
        ▼
[database/snapshots/schema.sql]
[database/snapshots/data.sql]
        │
        ▼
    git commit & push
```

Kết quả: Repo luôn chứa snapshot mới nhất của DB người đang làm việc.

---

### 4.2 Luồng Bootstrap (Developer B — người mới clone)

```
git clone → npm run dev
        │
        ▼
  databaseBootstrap.js
    └── isDatabaseEmpty()?
          ├── NO  → bỏ qua, DB đã có dữ liệu
          └── YES →
                ├── runSqlFile(schema.sql)   ← tạo toàn bộ bảng
                └── runSqlFile(data.sql)     ← nạp toàn bộ dữ liệu
        │
        ▼
  databasePatches.js
    └── readdir(migrations/) → sort → chạy từng file .sql
        │
        ▼
[DB sẵn sàng — giống hệt trạng thái của Developer A]
```

Toàn bộ quá trình xảy ra **tự động trong vài giây** khi server khởi động.

---

### 4.3 Luồng Migration (Thay đổi schema có kiểm soát)

```
Developer tạo file:
  database/migrations/20260520_add_review_table.sql

Nội dung file (idempotent):
  CREATE TABLE IF NOT EXISTS reviews (...);

↓ commit & push

Server khởi động:
  databasePatches.js
    └── sort(['20260512_app_adapter.sql', '20260520_add_review_table.sql'])
          └── chạy theo thứ tự alphabetical → an toàn, xác định
```

---

### 4.4 Luồng Reset (Quay về baseline)

```
Chạy thủ công:
  powershell -File database/baseline/import.ps1
    └── Yêu cầu nhập "RESET" để xác nhận
    └── mysql < baseline/3.8.sql   ← DROP DATABASE + tạo lại từ đầu

Sau đó:
  npm run migrate   ← apply lại toàn bộ migration
```

---

## 5. Cấu trúc file

```
database/
│
├── README.md                          ← Hướng dẫn sử dụng (quick reference)
├── datashare.md                       ← Tài liệu thiết kế này
│
├── baseline/                          ← Điểm khởi đầu lịch sử
│   ├── 3.8.sql                        ← Bản dump đầy đủ, có DROP DATABASE
│   │                                     Không tự động chạy. Chỉ dùng để reset.
│   └── import.ps1                     ← Script import thủ công (yêu cầu xác nhận)
│
├── migrations/                        ← Thay đổi schema theo thời gian
│   ├── 20260512_app_adapter.sql       ← Migration đầu tiên
│   └── YYYYMMDD_*.sql                 ← Các migration tiếp theo (thêm vào đây)
│
└── snapshots/                         ← Trạng thái DB hiện tại (auto-generated)
    ├── schema.sql                     ← CREATE TABLE statements (không có dữ liệu)
    ├── data.sql                       ← INSERT statements (toàn bộ dữ liệu)
    ├── export.mjs                     ← Engine export (đọc DB → ghi 2 file trên)
    └── export.ps1                     ← PowerShell wrapper để chạy thủ công
```

### Phân biệt vai trò 3 loại SQL file

| File | Mục đích | Ai tạo | Khi nào chạy |
|------|----------|--------|--------------|
| `baseline/3.8.sql` | Reset hoàn toàn về trạng thái gốc | Người (dump thủ công) | Thủ công, hiếm khi |
| `migrations/*.sql` | Thêm thay đổi schema mới | Người (viết tay) | Tự động mỗi lần server start |
| `snapshots/schema.sql` | Schema hiện tại đầy đủ | Hệ thống (auto-export) | Tự động khi bootstrap DB mới |
| `snapshots/data.sql` | Dữ liệu hiện tại đầy đủ | Hệ thống (auto-export) | Tự động khi bootstrap DB mới |

---

## 6. Backend integration

```
server startup
     │
     ├─ databaseBootstrap.js   ← bước 1: tự động nạp snapshots nếu DB trống
     │
     ├─ databasePatches.js     ← bước 2: chạy migrations/ theo thứ tự
     │
     └─ dataSyncScheduler.js   ← chạy nền: cứ N phút export snapshots mới
```

Các biến môi trường liên quan (trong `.env` hoặc `backend/.env`):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=agoda_clone

DATA_SYNC_ENABLED=true            # bật/tắt auto-export
DATA_SYNC_INTERVAL_MINUTES=5      # tần suất export (phút)
```

---

## 7. Nguyên tắc thiết kế

### Idempotency — Chạy nhiều lần vẫn an toàn
Migration file phải dùng `IF NOT EXISTS`, `ON DUPLICATE KEY UPDATE`, v.v. để tránh lỗi khi chạy lại.

### Fail-safe bootstrap
Bootstrap chỉ chạy khi DB **hoàn toàn trống**. Nếu DB đã có ít nhất 1 bảng → bỏ qua hoàn toàn. Không bao giờ ghi đè dữ liệu đang có.

### Separation of concerns
- `schema.sql` và `data.sql` tách biệt nhau → có thể nạp schema mà không cần dữ liệu (test environment).
- `baseline/` và `snapshots/` tách biệt → không nhầm lẫn giữa legacy dump và trạng thái hiện tại.

### Git-friendly
File SQL được viết dạng text thuần túy, mỗi INSERT 1 dòng → `git diff` hiển thị rõ ràng từng thay đổi dữ liệu.