# Huong dan thao tac database can_lam

## Khoi dong PostgreSQL

```powershell
docker compose -f backend/docker-compose.yml up -d postgres
```

## Export snapshot moi

```powershell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

## Reset database tu snapshot

```powershell
pnpm db:reset
```

Khi duoc hoi, go:

```text
RESET
```

## Chay tat ca bang start-all.bat

```powershell
.\start-all.bat
```

Lenh nay se tu dong reset PostgreSQL theo `database/snapshots/schema.sql` va `database/snapshots/data.sql`, sau do moi khoi dong backend va cac web app.

Trong luc he thong dang chay, cua so `nwh-db-sync` se tu dong cap nhat lai `database/snapshots/schema.sql` va `database/snapshots/data.sql` theo chu ky.

## Chay migration Prisma

```powershell
pnpm db:migrate
```

## Kiem tra nhanh backend sau khi reset

```powershell
pnpm --filter backend run build
```

Sau do chay lai `start-all.bat`.
