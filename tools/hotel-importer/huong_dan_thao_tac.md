# Huong dan su dung Hotel Importer Tool

Cong cu nay lay/bo sung du lieu khach san va sinh SQL PostgreSQL phu hop voi schema Prisma cua `can_lam`.

## Khoi dong

```bash
cd tools/hotel-importer
pnpm start
```

Sau do mo `http://localhost:4317`.

## Luong apply

1. Tool sinh `output/import-preview.sql` de xem truoc.
2. Khi luu, SQL duoc ghi vao `output/saved/apply.sql`.
3. Nut apply se dua cac block da duyet vao `database/snapshots/data.sql` theo cu phap PostgreSQL.

SQL sinh ra co tinh idempotent: property dung `ON CONFLICT (slug)`, amenity/link/media/room/rate plan deu tranh lap du lieu co san.
