# NOWAYHOME PROJECT SKILLS & RULES

Tai lieu nay dinh nghia cac quy tac cot loi cho du an Nowayhome.

## 1. BACKEND (NESTJS + POSTGRESQL)

* **Database baseline**: schema chuan nam trong `backend/prisma/schema.prisma`; snapshot data nguon cu duoc migrate bang `database/migration/migrate-legacy-snapshot.mjs`.
* **Database patches**: moi thay doi bo sung schema/data phai dat trong `database/patches/*.sql`.
  * Chay patch: `pnpm migrate`
  * App startup cung tu dong chay cac patch trong `database/patches`.
  * Patch SQL phai idempotent: chay lai nhieu lan khong duoc loi, khong duoc nhan doi data.
* **Backend code**: khong dat SQL tao/sua bang trong `backend`. Backend chi co runner doc file patch tu folder `database`.
* **Querying**: dung `pool.query` voi parameterized queries de tranh SQL Injection.
* **Validation**: dung Zod qua middleware `validateBody`. Schema nam tai `backend/src/validation/`.
* **Logging**: khong dung `console.log` trong API runtime. Dung Pino qua `backend/src/utils/logger.js`.
* **Error Handling**: dung `AppError` cho loi co chu dich.
* **Authentication**: dung Session Cookie HMAC signed. Khong tu y doi sang JWT neu chua co yeu cau.

## 2. FRONTEND (VITE + REACT + TAILWIND)

* **Styling**: dung Tailwind CSS va giu UI thong nhat theo tung app.
* **API Client**: dung `@nowayhome/api-client`; khong goi `axios` truc tiep khi da co wrapper.
* **State Management**: dung React Context hoac Zustand khi state that su toan cuc.
* **TypeScript**: uu tien type/interface ro rang, han che `any`.

## 3. QUY TAC CHUNG

* Phan hoi va comment nen dung Tieng Viet; ten bien/ham dung Tieng Anh.
* Truoc khi sua code, doc cau truc hien tai va uu tien thay doi nho, chac chan.
* Sau thay doi lon, chay `pnpm check` va neu cham frontend thi chay `pnpm build:web`.

Cap nhat lan cuoi: 12/05/2026
