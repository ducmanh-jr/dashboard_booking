# Nowayhome Backend

Express API for Nowayhome.

## Stack

- Express 5
- MySQL via `mysql2`
- Cookie session signed with HMAC
- Zod request validation
- Pino logging

## Commands

```powershell
pnpm install
pnpm dev
pnpm check
pnpm migrate
```

`pnpm migrate` runs SQL patch files from `../database/patches`.
Schema/data baseline lives in `../database/3.8.sql` and should not be edited.

## Main Routes

- `/api/healthz`
- `/api/auth/*`
- `/api/admin/*`
- `/api/rooms/*`
- `/api/bookings/*`
- `/api/mock-payment/*`
