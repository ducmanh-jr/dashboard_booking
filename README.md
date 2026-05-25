# Nowayhome Local Stack

## Structure

```text
backend/                  NestJS + Prisma PostgreSQL API, port 3001
database/
  3.8.sql                 Imported baseline schema/data. Do not edit.
  patches/                App database patches, auto-run by backend startup
  data-sync/              Manual database export tools and output files
web/                      React + Vite monorepo
  apps/admin              Admin app, port 5173
  apps/partner            Partner app, port 5174
  packages/api-client
  packages/auth-ui
start-all.bat
stop-all.bat
```

## Run Everything

```bat
start-all.bat
```

Stop everything:

```bat
stop-all.bat
```

## Useful Commands

```powershell
pnpm check
pnpm build:web
pnpm migrate
```

Reset from the imported baseline intentionally:

```powershell
pnpm db:reset:38
pnpm migrate
```

Export current DB schema/data:

```powershell
powershell -ExecutionPolicy Bypass -File database/data-sync/export.ps1
```

## URLs

- Admin: http://localhost:5173
- Partner: http://localhost:5174/login
- Backend health: http://localhost:3001/api/healthz
