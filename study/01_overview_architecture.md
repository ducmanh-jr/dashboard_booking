# ðŸ›ï¸ GIAI ÄOáº N 1: Tá»”NG QUAN KIáº¾N TRÃšC & Cáº¤U TRÃšC Há»† THá»NG

ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i bÃ i há»c Ä‘áº§u tiÃªn! Trong tÃ i liá»‡u nÃ y, chÃºng ta sáº½ cÃ¹ng má»• xáº» kiáº¿n trÃºc vÄ© mÃ´ cá»§a dá»± Ã¡n **Hotel Booking Platform** mÃ  báº¡n Ä‘ang tiáº¿p quáº£n. Viá»‡c hiá»ƒu rÃµ mÃ´ hÃ¬nh váº­n hÃ nh vÃ  luá»“ng dá»¯ liá»‡u sáº½ giÃºp báº¡n tá»± tin Ä‘á»c mÃ£ nguá»“n á»Ÿ cÃ¡c bÆ°á»›c sau mÃ  khÃ´ng sá»£ bá»‹ láº¡c hÆ°á»›ng.

---

## 1. Tá»”NG QUAN KIáº¾N TRÃšC Há»† THá»NG (System Architecture)

Há»‡ thá»‘ng Ä‘Æ°á»£c thiáº¿t káº¿ theo mÃ´ hÃ¬nh **Client-Server (KhÃ¡ch - Chá»§)** hiá»‡n Ä‘áº¡i vá»›i sá»± phÃ¢n tÃ¡ch rÃµ rÃ ng giá»¯a Frontend vÃ  Backend. Cá»¥ thá»ƒ:

* **Frontend (Monorepo)**: Sá»­ dá»¥ng cáº¥u trÃºc Monorepo quáº£n lÃ½ báº±ng npm workspaces. ToÃ n bá»™ mÃ£ nguá»“n á»©ng dá»¥ng client náº±m trong thÆ° má»¥c `web`. NÃ³ chá»©a 3 phÃ¢n há»‡ á»©ng dá»¥ng Ä‘á»™c láº­p xÃ¢y dá»±ng báº±ng **Vite, React vÃ  TypeScript**, chia sáº» chung cÃ¡c thÆ° viá»‡n dÃ¹ng chung (`api-client`, `auth-ui`).
* **Backend (RESTful API Monolith)**: XÃ¢y dá»±ng báº±ng **Node.js, Express, TypeScript**, tá»• chá»©c theo kiáº¿n trÃºc **Domain-Driven Modules** (má»—i thÆ° má»¥c lÃ  má»™t nghiá»‡p vá»¥ riÃªng).
* **Database (PostgreSQL)**: Há»‡ quáº£n trá»‹ cÆ¡ sá»Ÿ dá»¯ liá»‡u quan há»‡ lÆ°u giá»¯ thÃ´ng tin Ä‘áº·t phÃ²ng, phÃ²ng trá»‘ng, khÃ¡ch hÃ ng vÃ  Ä‘á»‘i tÃ¡c.

### ðŸ“Š SÆ¡ Ä‘á»“ Kiáº¿n trÃºc Tá»•ng quan (High-Level Architecture)

```mermaid
graph TD
    subgraph Frontend Monorepo [ThÆ° má»¥c: web/]
        A[apps/customer <br> KhÃ¡ch hÃ ng Ä‘áº·t phÃ²ng] 
        B[apps/partner <br> Äá»‘i tÃ¡c/KhÃ¡ch sáº¡n quáº£n lÃ½]
        C[apps/admin <br> Quáº£n trá»‹ há»‡ thá»‘ng]
        D[packages/api-client <br> API Client chung]
        E[packages/auth-ui <br> UI Auth chung]
        
        A --> D
        B --> D
        C --> D
        A --> E
        B --> E
    end

    subgraph Express Backend [ThÆ° má»¥c: backend/]
        F[backend/src/index.ts <br> HTTP Server]
        G[backend/src/middleware/ <br> CORS, Auth, Logger]
        H[backend/src/modules/ <br> Logic nghiá»‡p vá»¥ tá»«ng domain]
        
        D -- REST API Requests --> F
        F --> G --> H
    end

    subgraph Database Layer [ThÆ° má»¥c: database/]
        I[(PostgreSQL Database)]
        H -- Prisma PostgreSQL client --> I
    end

    style Frontend Monorepo fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style Express Backend fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style Database Layer fill:#fff7ed,stroke:#ea580c,stroke-width:2px
```

---

## 2. GIáº¢I THÃCH Cáº¤U TRÃšC THÆ¯ Má»¤C TIÃŠU CHUáº¨N

DÆ°á»›i Ä‘Ã¢y lÃ  sÆ¡ Ä‘á»“ cáº¥u trÃºc thÆ° má»¥c cá»‘t lÃµi cá»§a dá»± Ã¡n vÃ  Ã½ nghÄ©a cá»¥ thá»ƒ cá»§a tá»«ng pháº§n Ä‘á»ƒ báº¡n dá»… dÃ ng Ä‘á»‹nh vá»‹ file cáº§n Ä‘á»c:

### ðŸ“‚ A. Cáº¥u trÃºc Frontend Monorepo (`web/`)
ThÆ° má»¥c `web/` Ã¡p dá»¥ng mÃ´ hÃ¬nh **Monorepo** (Nhiá»u á»©ng dá»¥ng trong má»™t Repository). Äiá»u nÃ y cho phÃ©p 3 á»©ng dá»¥ng giao diá»‡n chia sáº» code logic ráº¥t tiá»‡n lá»£i.
* ðŸ“ **`apps/customer`**: á»¨ng dá»¥ng React dÃ nh cho khÃ¡ch hÃ ng tÃ¬m kiáº¿m phÃ²ng, Ä‘áº·t phÃ²ng vÃ  quáº£n lÃ½ lá»‹ch Ä‘áº·t phÃ²ng cá»§a mÃ¬nh.
* ðŸ“ **`apps/partner`**: á»¨ng dá»¥ng dÃ nh cho chá»§ khÃ¡ch sáº¡n (Ä‘á»‘i tÃ¡c) Ä‘Äƒng kÃ½ phÃ²ng, quáº£n lÃ½ phÃ²ng trá»‘ng, xem doanh thu vÃ  xÃ¡c nháº­n Ä‘Æ¡n Ä‘áº·t phÃ²ng.
* ðŸ“ **`apps/admin`**: á»¨ng dá»¥ng dÃ nh cho quáº£n trá»‹ viÃªn há»‡ thá»‘ng Ä‘á»ƒ phÃª duyá»‡t Ä‘á»‘i tÃ¡c má»›i, kiá»ƒm duyá»‡t khÃ¡ch sáº¡n, xem bÃ¡o cÃ¡o toÃ n há»‡ thá»‘ng vÃ  xá»­ lÃ½ tranh cháº¥p.
* ðŸ“ **`packages/api-client`**: SDK dÃ¹ng chung do chÃ­nh dá»± Ã¡n xÃ¢y dá»±ng Ä‘á»ƒ Ä‘Ã³ng gÃ³i cÃ¡c API endpoints cá»§a backend. Nhá» Ä‘Ã³, cáº£ 3 app trÃªn Ä‘á»u gá»i API má»™t cÃ¡ch thá»‘ng nháº¥t thÃ´ng qua package nÃ y.
* ðŸ“ **`packages/auth-ui`**: Chá»©a cÃ¡c component giao diá»‡n Ä‘Äƒng kÃ½, Ä‘Äƒng nháº­p vÃ  phÃ¢n quyá»n dÃ¹ng chung.

### ðŸ“‚ B. Cáº¥u trÃºc Backend (`backend/`)
ThÆ° má»¥c `backend/` Ä‘Æ°á»£c tá»• chá»©c theo cáº¥u trÃºc **Domain-Driven** ráº¥t khoa há»c vÃ  dá»… má»Ÿ rá»™ng.
* ðŸ“ **`src/config`**: Chá»©a cÃ¡c tá»‡p cáº¥u hÃ¬nh mÃ´i trÆ°á»ng, thÃ´ng sá»‘ káº¿t ná»‘i Database, JWT token vÃ  cÃ¡c biáº¿n mÃ´i trÆ°á»ng khÃ¡c.
* ðŸ“ **`src/database`**: NÆ¡i khá»Ÿi táº¡o káº¿t ná»‘i cÆ¡ sá»Ÿ dá»¯ liá»‡u (`db.ts`) vÃ  xá»­ lÃ½ cÃ¡c báº£n vÃ¡/migration (`databaseBootstrap.ts`, `databasePatches.ts`).
* ðŸ“ **`src/middleware`**: CÃ¡c bá»™ lá»c trung gian xá»­ lÃ½ Request trÆ°á»›c khi vÃ o Logic chÃ­nh:
  * XÃ¡c thá»±c ngÆ°á»i dÃ¹ng (Authentication Middleware).
  * PhÃ¢n quyá»n (Authorization: Admin, Partner, Customer).
  * Ghi log request (Sá»­ dá»¥ng `pino` & `pino-http`).
  * Xá»­ lÃ½ lá»—i táº­p trung (Global Error Handler).
* ðŸ“ **`src/validation`**: CÃ¡c schema Ä‘á»‹nh nghÄ©a kiá»ƒu dá»¯ liá»‡u vÃ  rÃ ng buá»™c Ä‘áº§u vÃ o (Sá»­ dá»¥ng thÆ° viá»‡n `zod`).
* ðŸ“ **`src/modules`**: **ÄÃ¢y chÃ­nh lÃ  TrÃ¡i Tim chá»©a Logic nghiá»‡p vá»¥ cá»‘t lÃµi cá»§a Backend!** Má»—i thÆ° má»¥c con Ä‘áº¡i diá»‡n cho má»™t phÃ¢n há»‡ nghiá»‡p vá»¥:
  * `auth/`: ÄÄƒng nháº­p, Ä‘Äƒng kÃ½, Ä‘Äƒng xuáº¥t, cáº¥p quyá»n.
  * `hotels/`: Quáº£n lÃ½ danh sÃ¡ch khÃ¡ch sáº¡n, phÃ²ng, loáº¡i phÃ²ng.
  * `bookings/`: Xá»­ lÃ½ Ä‘áº·t phÃ²ng, há»§y phÃ²ng, tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng.
  * `payments/`: XÃ­ch ná»‘i cá»•ng thanh toÃ¡n, cáº­p nháº­t tráº¡ng thÃ¡i thanh toÃ¡n.
  * `notifications/`: Gá»­i thÃ´ng bÃ¡o real-time tá»›i ngÆ°á»i dÃ¹ng vÃ  Ä‘á»‘i tÃ¡c khi cÃ³ sá»± kiá»‡n Ä‘áº·t phÃ²ng.
  * *Má»—i module sáº½ chá»©a file Ä‘á»‹nh nghÄ©a API Route (vÃ­ dá»¥: `bookings.routes.ts`) vÃ  Service chá»©a cÃ¡c truy váº¥n SQL trá»±c tiáº¿p hoáº·c logic xá»­ lÃ½ (vÃ­ dá»¥: `bookings.service.js`).*

---

## 3. LUá»’NG Dá»® LIá»†U Äáº¶T PHÃ’NG THá»°C Táº¾ (Booking Data Flow)

Äá»ƒ giÃºp báº¡n hÃ¬nh dung cÃ¡ch cÃ¡c thÃ nh pháº§n trÃªn phá»‘i há»£p vá»›i nhau, Ä‘Ã¢y lÃ  sÆ¡ Ä‘á»“ tuáº§n tá»± (Sequence Diagram) mÃ´ táº£ toÃ n bá»™ luá»“ng Ä‘i tá»« khi khÃ¡ch hÃ ng tÃ¬m kiáº¿m cho Ä‘áº¿n lÃºc Ä‘áº·t phÃ²ng thÃ nh cÃ´ng:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ðŸ‘¤ KhÃ¡ch hÃ ng
    participant AppCust as ðŸ“± apps/customer
    participant APIClient as ðŸ“¦ packages/api-client
    participant BE as âš™ï¸ Express Backend (bookings.routes)
    participant BEService as ðŸ§  Bookings Service
    participant DB as ðŸ—„ï¸ PostgreSQL Database
    participant PartnerApp as ðŸ¨ apps/partner (Chá»§ khÃ¡ch sáº¡n)

    %% 1. TÃŒM KIáº¾M PHÃ’NG
    Note over Customer, DB: BÆ°á»›c 1: TÃ¬m kiáº¿m & Lá»c phÃ²ng trá»‘ng
    Customer->>AppCust: Nháº­p Ä‘iá»ƒm Ä‘áº¿n, Check-in, Check-out, Sá»‘ khÃ¡ch
    AppCust->>APIClient: Gá»i API láº¥y danh sÃ¡ch phÃ²ng trá»‘ng
    APIClient->>BE: GET /api/hotels/available?checkIn=...&checkOut=...
    BE->>DB: Truy váº¥n SELECT loáº¡i phÃ²ng trá»‘ng trong khoáº£ng ngÃ y
    DB-->>BE: Tráº£ vá» danh sÃ¡ch RoomTypes kháº£ dá»¥ng
    BE-->>APIClient: JSON data (KhÃ¡ch sáº¡n + Loáº¡i phÃ²ng trá»‘ng)
    APIClient-->>AppCust: Render UI danh sÃ¡ch khÃ¡ch sáº¡n
    AppCust-->>Customer: Hiá»ƒn thá»‹ giao diá»‡n danh sÃ¡ch phÃ²ng Ä‘áº¹p máº¯t

    %% 2. CHá»ŒN PHÃ’NG & XEM CHI TIáº¾T
    Note over Customer, DB: BÆ°á»›c 2: Xem chi tiáº¿t & Nháº­p thÃ´ng tin
    Customer->>AppCust: Click chá»n má»™t KhÃ¡ch sáº¡n & Loáº¡i phÃ²ng cá»¥ thá»ƒ
    AppCust->>APIClient: GET /api/hotels/:id/details
    APIClient->>BE: Gá»i backend láº¥y chi tiáº¿t giÃ¡ phÃ²ng vÃ  mÃ´ táº£
    BE->>DB: Query chi tiáº¿t khÃ¡ch sáº¡n & cÃ¡c phÃ²ng thá»±c táº¿
    DB-->>BE: Dá»¯ liá»‡u chi tiáº¿t
    BE-->>AppCust: JSON chi tiáº¿t
    AppCust-->>Customer: Hiá»ƒn thá»‹ trang thanh toÃ¡n vÃ  Ä‘iá»n thÃ´ng tin khÃ¡ch Ä‘áº·t

    %% 3. Báº¤M Äáº¶T PHÃ’NG
    Note over Customer, DB: BÆ°á»›c 3: Gá»­i yÃªu cáº§u Ä‘áº·t phÃ²ng (HÃ nh Ä‘á»™ng WRITE cá»±c ká»³ quan trá»ng)
    Customer->>AppCust: Click "XÃ¡c nháº­n Ä‘áº·t phÃ²ng"
    AppCust->>APIClient: POST /api/bookings (KÃ¨m checkIn, checkOut, roomTypeId)
    APIClient->>BE: POST /api/bookings Request
    
    %% 4. Xá»¬ LÃ BACKEND (LOGIC CORE)
    rect rgb(240, 253, 244)
        Note over BE, DB: Xá»­ lÃ½ Transaction & Lock Ä‘á»ƒ chá»‘ng trÃ¹ng láº·p (Concurrency)
        BE->>BEService: Gá»i hÃ m service Ä‘áº·t phÃ²ng
        BEService->>DB: Báº¯t Ä‘áº§u TRANSACTION (START TRANSACTION)
        BEService->>DB: Kiá»ƒm tra láº¡i phÃ²ng trá»‘ng & LOCK báº£n ghi (SELECT ... FOR UPDATE)
        alt PhÃ²ng cÃ²n trá»‘ng
            BEService->>DB: INSERT INTO bookings (...)
            BEService->>DB: INSERT INTO room_occupancies (ÄÃ¡nh dáº¥u phÃ²ng Ä‘Ã£ bá»‹ chiáº¿m ngÃ y Ä‘Ã³)
            BEService->>DB: COMMIT TRANSACTION
            DB-->>BEService: ThÃ nh cÃ´ng
        else PhÃ²ng Ä‘Ã£ bá»‹ ngÆ°á»i khÃ¡c Ä‘áº·t máº¥t (Race Condition)
            BEService->>DB: ROLLBACK TRANSACTION
            BEService-->>BE: NÃ©m lá»—i "Room Not Available"
        end
    end

    %% 5. XÃC NHáº¬N & THÃ”NG BÃO
    alt Äáº·t phÃ²ng thÃ nh cÃ´ng
        BEService-->>BE: Tráº£ vá» Ä‘á»‘i tÆ°á»£ng Booking Ä‘Ã£ táº¡o
        BE-->>APIClient: HTTP 201 Created (Booking details)
        APIClient-->>AppCust: Äáº·t phÃ²ng thÃ nh cÃ´ng!
        AppCust-->>Customer: Hiá»ƒn thá»‹ mÃ n hÃ¬nh "Äáº·t phÃ²ng thÃ nh cÃ´ng! ðŸŽ‰"
        BE-)PartnerApp: Gá»­i thÃ´ng bÃ¡o Real-time (Socket/Notification) bÃ¡o cÃ³ Ä‘Æ¡n Ä‘áº·t phÃ²ng má»›i
    else Tháº¥t báº¡i
        BE-->>APIClient: HTTP 400 Bad Request / 409 Conflict
        APIClient-->>AppCust: BÃ¡o lá»—i phÃ²ng Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t
        AppCust-->>Customer: Hiá»ƒn thá»‹: "Ráº¥t tiáº¿c, phÃ²ng vá»«a Ä‘Æ°á»£c Ä‘áº·t bá»Ÿi khÃ¡ch khÃ¡c."
    end
```

---

## ðŸ’¡ NHá»®NG FILE Cá»T LÃ•I Báº N Cáº¦N CHÃš Ã LÃšC NÃ€Y
Khi báº¯t Ä‘áº§u khÃ¡m phÃ¡, hÃ£y Ä‘á»‹nh vá»‹ ngay cÃ¡c file cá»‘t lÃµi sau Ä‘á»ƒ hiá»ƒu toÃ n bá»™ logic nghiá»‡p vá»¥ (hÃ£y click vÃ o link Ä‘á»ƒ xem):

1. **Backend Server Setup**: [backend/src/index.ts](../backend/src/index.ts) - NÆ¡i cáº¥u hÃ¬nh Express, Middleware, káº¿t ná»‘i cá»•ng vÃ  khá»Ÿi cháº¡y server.
2. **Database Connector**: [backend/src/db.ts](../backend/src/db.ts) (hoáº·c náº±m trong `src/database/db.ts`) - Cáº¥u hÃ¬nh connection pool PostgreSQL.
3. **Core API Routes & Services cho Bookings**:
   * API Endpoints: [backend/src/modules/bookings/bookings.routes.ts](../backend/src/modules/bookings/bookings.routes.ts) - NÆ¡i Ä‘á»‹nh nghÄ©a cÃ¡c API nhÆ° POST `/`, GET `/customer`, v.v.
   * Query logic: [backend/src/modules/bookings/bookings.service.js](../backend/src/modules/bookings/bookings.service.js) - NÆ¡i chá»©a truy váº¥n SQL kiá»ƒm tra phÃ²ng trá»‘ng vÃ  ghi nháº­n booking vÃ o Database.
4. **Shared API SDK**: [web/packages/api-client/](../web/packages/api-client/) - Cáº§u ná»‘i trung gian gá»i tá»« Client lÃªn Server.

---

## ðŸ™‹ CÃ‚U Há»ŽI THáº¢O LUáº¬N & BÆ¯á»šC TIáº¾P THEO

TÃ´i hy vá»ng tÃ i liá»‡u trá»±c quan nÃ y Ä‘Ã£ giÃºp báº¡n hÃ¬nh dung Ä‘Æ°á»£c bá»©c tranh toÃ n cáº£nh má»™t cÃ¡ch sáº¯c nÃ©t nháº¥t!

**Äá»ƒ chÃºng ta chuyá»ƒn sang Giai Ä‘oáº¡n 2: CÆ  Sá»ž Dá»® LIá»†U & MÃ” HÃŒNH Dá»® LIá»†U, báº¡n hÃ£y gá»­i cho tÃ´i:**
1. Cáº¥u trÃºc báº£ng (schema) trong file SQL cá»§a dá»± Ã¡n (vÃ­ dá»¥ file `backend/schema.sql` hoáº·c tá»‡p tÆ°Æ¡ng Ä‘Æ°Æ¡ng).
2. Hoáº·c mÃ´ táº£ nhanh cÃ¡c báº£ng dá»¯ liá»‡u náº¿u báº¡n cÃ³ sáºµn.

*TÃ´i Ä‘ang á»Ÿ Ä‘Ã¢y Ä‘á»ƒ Ä‘á»“ng hÃ nh cÃ¹ng báº¡n. Khi báº¡n sáºµn sÃ ng, hÃ£y pháº£n há»“i vÃ  chÃºng ta sáº½ tiáº¿n tá»›i giai Ä‘oáº¡n tiáº¿p theo Ä‘á»ƒ giáº£i mÃ£ cáº¥u trÃºc dá»¯ liá»‡u!*

