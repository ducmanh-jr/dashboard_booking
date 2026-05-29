# Database Sharing Strategy cho can_lam

## 1. Muc tieu

`can_lam/database` duoc thiet ke de lam dung vai tro nhu `ban_goc/database`, nhung chuan hoa cho PostgreSQL:

- Git la noi luu trang thai schema va data moi nhat.
- Developer moi co the reset DB local tu snapshot ma khong can thao tac thu cong phuc tap.
- Schema thay doi duoc quan ly qua Prisma migration va duoc tai lieu hoa trong `database/migrations`.
- Snapshot co the export lai bat cu luc nao tu database dang chay.

## 2. Luong export

```text
PostgreSQL dang chay
        |
        v
database/snapshots/export.ps1
        |
        v
database/snapshots/export.mjs
        |
        +-- pg_dump --schema-only -> schema.sql
        +-- pg_dump --data-only   -> data.sql
        |
        v
commit snapshots vao repo
```

Tool tu dong uu tien `pg_dump` local. Neu may khong co `pg_dump`, tool dung Docker container PostgreSQL cua du an.

Khi `start-all.bat` dang chay, mot tien trinh nen tu dong goi export theo chu ky. Vi vay du lieu nguoi A thao tac trong app se duoc ghi nguoc ve `database/snapshots/data.sql`.

## 3. Luong start/reset

```text
start-all.bat hoac pnpm db:reset
        |
        v
database/baseline/import.ps1
        |
        v
go RESET de xac nhan
        |
        v
DROP SCHEMA public CASCADE
CREATE SCHEMA public
        |
        +-- psql -f snapshots/schema.sql
        +-- psql -f snapshots/data.sql
        |
        v
DB local giong snapshot moi nhat
```

Voi `start-all.bat`, buoc reset chay tu dong khong hoi `RESET` de dung dung mong muon: folder snapshot la nguon chuan, DB local cu se bi thay the.

## 4. Vai tro tung nhom file

| Nhom file | Vai tro | Khi dung |
|---|---|---|
| `baseline/import.ps1` | Reset DB tu snapshot | Khi can lam sach DB local |
| `migrations/*.sql` | Luu vet schema SQL tham chieu | Khi review thay doi DB |
| `snapshots/schema.sql` | Schema hien tai | Bootstrap/reset |
| `snapshots/data.sql` | Data hien tai | Bootstrap/reset |
| `scripts/postgres-tools.mjs` | Ham dung chung cho pg_dump/psql/Docker | Noi bo tool |

## 5. Nguyen tac an toan

- Reset DB bat buoc go `RESET`.
- Script chi thao tac tren `DATABASE_URL` cua `backend/.env` hoac `database/.env`.
- Khong sinh dummy snapshot. Neu khong ket noi duoc PostgreSQL, script phai bao loi that.
- Khong dung cu phap hay driver cua he database cu trong `can_lam`.

## 6. Khi cap nhat data

1. Chay he thong va sua/import data tren PostgreSQL.
2. Chay:

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

3. Kiem tra diff cua `database/snapshots/schema.sql` va `database/snapshots/data.sql`.
4. Commit snapshot neu day la data chuan moi.
