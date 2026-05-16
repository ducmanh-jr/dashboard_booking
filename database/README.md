# Database

Thư mục này chứa toàn bộ nội dung liên quan đến database của hệ thống.

```
database/
├── baseline/
│   ├── 3.8.sql        ← Baseline gốc (legacy). Có chứa DROP DATABASE — chỉ chạy thủ công khi cần reset hoàn toàn.
│   └── import.ps1     ← Script import baseline thủ công.
├── migrations/
│   └── YYYYMMDD_*.sql ← Các migration file được đánh số theo ngày. Chạy tự động khi server khởi động.
└── snapshots/
    ├── schema.sql      ← Schema hiện tại (auto-generated). Dùng để bootstrap DB mới.
    ├── data.sql        ← Dữ liệu hiện tại (auto-generated). Dùng để bootstrap DB mới.
    ├── export.mjs      ← Engine export (Node.js ESM).
    └── export.ps1      ← PowerShell wrapper để chạy export thủ công.
```

---

## 1. baseline/ — Baseline gốc

`baseline/3.8.sql` là bản dump MySQL đầy đủ, có thể tạo lại database `agoda_clone` từ đầu.  
File này chứa `DROP DATABASE IF EXISTS` nên **không được** chạy tự động.

Chỉ dùng khi bạn muốn **reset hoàn toàn** database về trạng thái ban đầu:

```powershell
powershell -ExecutionPolicy Bypass -File database/baseline/import.ps1
```

> Script yêu cầu gõ `RESET` để xác nhận trước khi thực thi.

---

## 2. migrations/ — Migration files

Chứa các file SQL được đánh số theo ngày (`YYYYMMDD_tên.sql`).  
Mỗi file phải **idempotent** (chạy nhiều lần không gây lỗi).

**Chạy tự động** khi server khởi động (qua `backend/src/databasePatches.js`).  
**Chạy thủ công:**

```powershell
pnpm migrate   # từ thư mục gốc
```

Quy tắc đặt tên:
- `20260512_app_adapter.sql` — ngày + mô tả ngắn
- Các file được sort theo tên → thứ tự chạy = thứ tự alphabetical

---

## 3. snapshots/ — Database snapshots

Hai file `schema.sql` và `data.sql` là **snapshot tự động** của database hiện tại.

### Tự động đồng bộ

Backend tự export snapshot theo lịch khi bật:

```env
DATA_SYNC_ENABLED=true
DATA_SYNC_INTERVAL_MINUTES=5
```

### Export thủ công

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

### Cơ chế nạp dữ liệu (Safety First)

Để tránh việc vô tình làm mất dữ liệu quan trọng, cơ chế nạp (bootstrap) hoạt động như sau:

*   **Mặc định (Tự động)**: Hệ thống **CHỈ** nạp dữ liệu từ `snapshots` khi Database của bạn đang **trống rỗng** (chưa có bảng nào). Nếu đã có bảng, Backend sẽ bỏ qua bước này để bảo vệ dữ liệu hiện tại của bạn.
*   **Xóa sạch & Nạp lại (Chủ động)**: Nếu bạn muốn xóa toàn bộ dữ liệu cũ để đồng bộ hoàn toàn với bản snapshot mới nhất, hãy chạy lệnh:
    ```bash
    pnpm db:reset:latest
    ```
    *Lưu ý: Lệnh này sẽ DROP toàn bộ bảng cũ và nạp lại từ snapshots/.*

*   **Reset cưỡng bức mỗi khi khởi động**: Nếu bạn muốn Backend luôn luôn reset DB mỗi khi restart (phù hợp cho môi trường Demo), hãy thêm dòng này vào `.env`:
    ```env
    DB_FORCE_BOOTSTRAP=true
    ```

---

## Workflow tổng quát

### Lần đầu clone dự án

```powershell
# Chỉ cần start server — tự động bootstrap
pnpm dev
```

### Reset database về bản snapshot mới nhất
```powershell
pnpm db:reset:latest
```

### Reset database về bản baseline (v3.8)
```powershell
pnpm db:reset:38
pnpm migrate
```

### Thêm thay đổi schema mới

1. Tạo file `database/migrations/YYYYMMDD_mô_tả.sql`.
2. Viết SQL idempotent (dùng `IF NOT EXISTS`, `ON DUPLICATE KEY`, v.v.).
3. Khởi động lại server — migration tự chạy.
4. Snapshot sẽ được cập nhật tự động (nếu `DATA_SYNC_ENABLED=true`).