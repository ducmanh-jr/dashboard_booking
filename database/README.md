# Database

Thu muc nay la bo cong cu quan ly database cho `can_lam`. Y tuong giong `ban_goc/database`: co baseline de reset, co migrations de luu vet thay doi schema, va co snapshots de chia se trang thai DB hien tai. Khac biet quan trong: `can_lam` chi dung PostgreSQL.

```text
database/
├── .env
├── baseline/
│   ├── import.ps1
│   └── import.mjs
├── migrations/
│   └── 20260513_init_schema.sql
├── scripts/
│   └── postgres-tools.mjs
└── snapshots/
    ├── schema.sql
    ├── data.sql
    ├── export.ps1
    └── export.mjs
```

## 1. Cau hinh

Gia tri ket noi chuan nam trong `backend/.env`. File `database/.env` chi la cau hinh phu cho tool:

```env
DATABASE_URL="postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
POSTGRES_DOCKER_CONTAINER=nowayhome-postgres
POSTGRES_DOCKER_COMPOSE=backend/docker-compose.yml
POSTGRES_DOCKER_SERVICE=postgres
DATA_SYNC_INTERVAL_SECONDS=60
```

Tool se uu tien `backend/.env`, nen backend va database script luon dung cung mot database.

## 2. Export snapshot

Chay lenh:

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

Ket qua:

- `database/snapshots/schema.sql`: schema PostgreSQL hien tai.
- `database/snapshots/data.sql`: du lieu PostgreSQL hien tai.

Script tu dung `pg_dump` neu may co cai san. Neu khong co, script tu chay `pg_dump` ben trong Docker container `nowayhome-postgres`.

Khi chay `start-all.bat`, he thong tu dong export lai `schema.sql` va `data.sql` theo chu ky de luu cac thay doi data phat sinh trong luc app dang chay.

## 3. Reset database tu snapshot

Chay lenh:

```powershell
pnpm db:reset
```

Script se yeu cau go `RESET`, sau do:

1. Drop toan bo schema `public`.
2. Tao lai schema `public`.
3. Nap `database/snapshots/schema.sql`.
4. Nap `database/snapshots/data.sql`.

## 3.1. Tu dong khi chay start-all.bat

`start-all.bat` se coi `database/snapshots/schema.sql` va `database/snapshots/data.sql` la nguon du lieu chuan moi nhat. Moi lan chay, script se:

1. Khoi dong PostgreSQL.
2. Xoa schema `public` hien tai.
3. Nap lai schema va data tu snapshots.
4. Chay Prisma migrate.
5. Khoi dong cac app.

Dieu nay dam bao nguoi B tai folder cua nguoi A ve va bam `start-all.bat` se nhan dung data moi trong folder.

## 4. Migration

Nguon schema chuan cua he PostgreSQL van la Prisma:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`

Thu muc `database/migrations/` giu ban SQL tham chieu de tuong tu cau truc ben `ban_goc`. Khi thay doi schema that, hay tao Prisma migration truoc, sau do export/copy SQL tu Prisma sang `database/migrations/` neu can tai lieu hoa.

Chay migration Prisma:

```powershell
pnpm db:migrate
```

## 5. Quy trinh de xuat

Sau khi sua data hoac import data moi:

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

Sau khi clone sang may khac hoac can reset DB:

```powershell
pnpm db:reset
pnpm db:migrate
```
