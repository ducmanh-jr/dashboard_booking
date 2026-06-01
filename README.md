# Nowayhome Local Stack

## Structure

```text
backend/                  NestJS + Prisma + PostgreSQL API, port 3001
  prisma/schema.prisma    20 models, 27 enums, BigInt PKs, soft-delete
  docker-compose.yml      PostgreSQL 16-alpine, container nowayhome-postgres
  src/
    modules/
      admin/              Admin-facing endpoints
      auth/               JWT auth, OTP, Google OAuth
      bookings/           Booking CRUD + status flow
      partner/            Partner portal: properties, room-types, media
      properties/         Public property search & detail
      reviews/            Review moderation
      users/              User management
      payments/           Payments module (not mounted yet)
      promotions/         Promotions & vouchers
database/
  baseline/               import.mjs — drop + restore DB from snapshots
  snapshots/              schema.sql + data.sql (live, shared via auto-export)
  auto_export_loop.ps1    Continuous background DB export for team sync
web/
  apps/admin              React + Vite, port 5173
  apps/partner            React + Vite, port 5174
  apps/customer           React + Vite, port 5175
  packages/api-client     Shared API client
  packages/auth-ui        Shared auth UI components
mobile-app/               Expo React Native, port 8081
tools/
  hotel-importer/
start-all.bat             → start-all.ps1 (full orchestration)
stop-all.bat              Kill all NWH processes + Docker
```

## Prerequisites

- Node.js
- pnpm
- Docker Desktop (must be running)

```powershell
node --version
pnpm --version
docker --version
```

## First-time Setup

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Create backend env file

Copy and edit:

```powershell
copy backend\.env.example backend\.env
```

Minimum required content in `backend/.env`:

```env
DATABASE_URL="postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
JWT_ACCESS_SECRET="change_me_access_secret"
JWT_REFRESH_SECRET="change_me_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
```

### 3. Generate Prisma client

```powershell
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
```

## Run Everything (manual commands)

### Start PostgreSQL

```powershell
docker compose -f backend/docker-compose.yml up -d postgres
```

### Reset & load DB snapshot

```powershell
node database/baseline/import.mjs
```

### Build backend

```powershell
pnpm --filter backend run build
```

### Start backend

```powershell
pnpm --filter backend run start:prod
```

### Start web apps (separate terminals)

```powershell
# Admin — http://localhost:5173
pnpm --filter webadmin run dev

# Partner — http://localhost:5174
pnpm --filter webpartner run dev

# Customer — http://localhost:5175
pnpm --filter fe-web-user run dev
```

### Start mobile (separate terminal)

```powershell
cd mobile-app
npx expo start
```

## Stop Everything (manual)

```powershell
# Stop web/backend processes: Ctrl+C in each terminal

# Stop PostgreSQL
docker compose -f backend/docker-compose.yml stop postgres
```

## URLs

| Service | URL |
|---------|-----|
| Admin | http://localhost:5173 |
| Partner | http://localhost:5174/login |
| Customer | http://localhost:5175 |
| Backend health | http://localhost:3001/api/healthz |
| Swagger UI | http://localhost:3001/api-docs |
| Mobile (Expo) | http://localhost:8081 |

## Useful Commands

```powershell
# Type-check all packages
pnpm check

# Build all web apps
pnpm build:web

# Run Prisma migrations
pnpm db:migrate

# Export current DB snapshot
pnpm db:export

# Reset DB to baseline snapshot
pnpm db:reset

# Export snapshot manually via PowerShell
powershell -ExecutionPolicy Bypass -File database/snapshots/export.ps1
```

## Database Workflow

Snapshots live in `database/snapshots/schema.sql` + `data.sql`.

```powershell
# Reset DB from latest snapshot
node database/baseline/import.mjs

# Then re-run Prisma migrations
pnpm db:migrate
```

`auto_export_loop.ps1` runs in background during dev to keep snapshots fresh for team sharing.
