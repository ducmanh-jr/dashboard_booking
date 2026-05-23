# ðŸ” PHÃ‚N TÃCH CHI TIáº¾T LUá»’NG NGHIá»†P Vá»¤: ADMIN DUYá»†T Äá»I TÃC (PARTNER APPROVAL FLOW)

Trong bÃ i há»c nÃ y, chÃºng ta sáº½ cÃ¹ng nhau bÃ³c tÃ¡ch luá»“ng dá»¯ liá»‡u **End-to-End** cá»§a tÃ­nh nÄƒng **Admin duyá»‡t Ä‘á»‘i tÃ¡c**. ÄÃ¢y lÃ  má»™t tÃ­nh nÄƒng kinh Ä‘iá»ƒn Ä‘áº¡i diá»‡n cho luá»“ng CRUD vÃ  phÃª duyá»‡t thÃ´ng tin (Approval Flow) cÃ³ phÃ¢n quyá»n báº£o máº­t cao.

ChÃºng ta sáº½ Ä‘i qua 5 cháº·ng, tá»« nÃºt báº¥m trÃªn giao diá»‡n cho Ä‘áº¿n cÃ¢u lá»‡nh SQL thay Ä‘á»•i tráº¡ng thÃ¡i trong CÆ¡ sá»Ÿ dá»¯ liá»‡u.

---

## ðŸ—ºï¸ Báº¢N Äá»’ LUá»’NG ÄI CHI TIáº¾T (Báº°NG TIáº¾NG VIá»†T)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as ðŸ‘¤ Quáº£n trá»‹ viÃªn (Giao diá»‡n)
    participant UI as ðŸ–¥ï¸ Giao diá»‡n (PartnersTab.tsx)
    participant API as ðŸ“¦ Gá»i API (partnersApi.ts)
    participant Route as âš™ï¸ ÄÆ°á»ng dáº«n API (partners.routes.ts)
    participant Auth as ðŸ”’ XÃ¡c thá»±c (auth.middleware.ts)
    participant DB as ðŸ—„ï¸ CÆ¡ sá»Ÿ dá»¯ liá»‡u (Báº£ng partner_profiles)

    Admin->>UI: Click nÃºt "Duyá»‡t" (Icon check)
    UI->>API: Gá»i hÃ m approvePartner(partner.id)
    API->>Route: Gá»­i yÃªu cáº§u POST /api/admin/partners/:id/approve
    Note over Route, Auth: Cháº·ng 1: Kiá»ƒm tra Báº£o máº­t & PhÃ¢n quyá»n
    Route->>Auth: requireAdmin (Kiá»ƒm tra Cookie Session & Quyá»n Staff)
    Auth-->>Route: XÃ¡c thá»±c há»£p lá»‡
    Note over Route, DB: Cháº·ng 2: Thá»±c thi Nghiá»‡p vá»¥ trong Database
    Route->>DB: UPDATE kyc_status = 'approved' WHERE user_id = :id
    DB-->>Route: ThÃ nh cÃ´ng (Cáº­p nháº­t thÃ nh cÃ´ng 1 dÃ²ng)
    Route-->>API: Pháº£n há»“i JSON { ok: true }
    API-->>UI: Cáº­p nháº­t tráº¡ng thÃ¡i React (React Query lÃ m má»›i dá»¯ liá»‡u)
    UI-->>Admin: Hiá»ƒn thá»‹ giao diá»‡n "ÄÃ£ duyá»‡t" mÃ u xanh lá»¥c ðŸŽ‰
```

---

## ðŸš€ CHI TIáº¾T Tá»ªNG CHáº¶NG VÃ€ CÃC DÃ’NG CODE Cá»T LÃ•I

### CHáº¶NG 1: GIAO DIá»†N NGÆ¯á»œI DÃ™NG (FRONTEND UI)
Luá»“ng báº¯t Ä‘áº§u táº¡i giao diá»‡n Quáº£n trá»‹ viÃªn (Admin Dashboard) -> Tab "Äá»‘i tÃ¡c".

* **Tá»‡p tin thá»±c táº¿:** [PartnersTab.tsx](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx)
* **ÄÆ°á»ng dáº«n má»Ÿ nhanh (Nháº¥p Ä‘á»ƒ nháº£y tháº³ng tá»›i dÃ²ng code):** [PartnersTab.tsx: DÃ²ng 276](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx#L276)
* **DÃ²ng code kÃ­ch hoáº¡t:**
  * Táº¡i dÃ²ng 276, component hiá»ƒn thá»‹ nÃºt Duyá»‡t Ä‘á»‘i tÃ¡c dÆ°á»›i dáº¡ng icon mÃ u xanh lá»¥c (`text-emerald-600`):
    ```tsx
    <Button 
      variant="ghost" 
      size="icon" 
      className="size-8 text-emerald-600 hover:bg-emerald-50" 
      onClick={onApprove} 
      disabled={isProcessing}
    >
      <Check className="size-4" />
    </Button>
    ```
  * Khi Admin click chuá»™t vÃ o nÃºt nÃ y, sá»± kiá»‡n `onClick` sáº½ kÃ­ch hoáº¡t callback `onApprove`.
  * Callback `onApprove` Ä‘Æ°á»£c truyá»n xuá»‘ng tá»« component cha táº¡i [PartnersTab.tsx: DÃ²ng 171](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx#L171):
    ```tsx
    onApprove={() => approveMutation.mutate(partner.id)}
    ```
  * Táº¡i Ä‘Ã¢y, há»‡ thá»‘ng sá»­ dá»¥ng **React Query (`useMutation`)** Ä‘á»ƒ xá»­ lÃ½ tráº¡ng thÃ¡i báº¥t Ä‘á»“ng bá»™ (Loading, Success, Error). Biáº¿n `approveMutation` Ä‘Æ°á»£c khai bÃ¡o á»Ÿ [PartnersTab.tsx: DÃ²ng 63](../web/apps/admin/src/features/dashboard/components/tabs/PartnersTab.tsx#L63):
    ```tsx
    const approveMutation = useMutation({
      mutationFn: (id: number) => approvePartner(id),
      onSuccess: () => {
        // Sau khi duyá»‡t thÃ nh cÃ´ng, load láº¡i danh sÃ¡ch Ä‘á»‘i tÃ¡c Ä‘á»ƒ cáº­p nháº­t UI
        queryClient.invalidateQueries({ queryKey: ['partners'] });
        toast.success("ÄÃ£ duyá»‡t Ä‘á»‘i tÃ¡c thÃ nh cÃ´ng!");
      }
    });
    ```
  * **Giáº£i thÃ­ch chi tiáº¿t tá»«ng dÃ²ng code Frontend:**
    * `<Button onClick={onApprove}>`: Khi click, React sáº½ gá»i hÃ m `onApprove` Ä‘Æ°á»£c truyá»n tá»« cha xuá»‘ng con thÃ´ng qua props.
    * `approveMutation.mutate(partner.id)`: ÄÃ¢y lÃ  cÃ¡ch kÃ­ch hoáº¡t má»™t hÃ nh Ä‘á»™ng thay Ä‘á»•i dá»¯ liá»‡u (mutation) trong thÆ° viá»‡n **React Query**. HÃ m `.mutate(id)` sáº½ nháº­n vÃ o ID cá»§a Ä‘á»‘i tÃ¡c vÃ  truyá»n nÃ³ cho `mutationFn`.
    * `mutationFn: (id) => approvePartner(id)`: Khai bÃ¡o hÃ m thá»±c thi chÃ­nh. React Query sáº½ láº¥y `id` tá»« lá»‡nh mutate á»Ÿ trÃªn vÃ  gá»i hÃ m `approvePartner(id)` (gá»i API thá»±c táº¿).
    * `onSuccess: () => { ... }`: Block code nÃ y **chá»‰** cháº¡y náº¿u hÃ m `approvePartner` thÃ nh cÃ´ng (khÃ´ng nÃ©m ra lá»—i).
    * `queryClient.invalidateQueries({ queryKey: ['partners'] })`: DÃ²ng code "ma thuáº­t" cá»§a React Query! NÃ³ Ä‘Ã¡nh dáº¥u bá»™ nhá»› Ä‘á»‡m (cache) mang tÃªn `['partners']` lÃ  "Ä‘Ã£ cÅ©". Ngay láº­p tá»©c, React Query sáº½ tá»± Ä‘á»™ng ngáº§m gá»­i má»™t request GET lÃªn server Ä‘á»ƒ láº¥y danh sÃ¡ch Ä‘á»‘i tÃ¡c má»›i nháº¥t vÃ  cáº­p nháº­t láº¡i giao diá»‡n (Ä‘á»•i mÃ u xanh thÃ nh tráº¡ng thÃ¡i ÄÃ£ duyá»‡t) mÃ  ngÆ°á»i dÃ¹ng **khÃ´ng cáº§n pháº£i F5 láº¡i trang**.

---

### CHáº¶NG 2: Lá»šP GIAO TIáº¾P API (API CLIENT)
HÃ m `approvePartner` lÃ  cáº§u ná»‘i gá»­i yÃªu cáº§u HTTP tá»« trÃ¬nh duyá»‡t lÃªn mÃ¡y chá»§.

* **Tá»‡p tin thá»±c táº¿:** [partnersApi.ts](../web/apps/admin/src/api/partnersApi.ts)
* **ÄÆ°á»ng dáº«n má»Ÿ nhanh (Nháº¥p Ä‘á»ƒ nháº£y tháº³ng tá»›i dÃ²ng code):** [partnersApi.ts: DÃ²ng 29](../web/apps/admin/src/api/partnersApi.ts#L29)
* **DÃ²ng code kÃ­ch hoáº¡t:** (DÃ²ng 29-31)
  ```typescript
  export const approvePartner = async (id: number) => {
    return await api(`/admin/partners/${id}/approve`, { method: "POST" });
  };
  ```
  * **Giáº£i thÃ­ch chi tiáº¿t tá»«ng dÃ²ng code API Client:**
    * `export const approvePartner`: Xuáº¥t hÃ m nÃ y ra Ä‘á»ƒ cÃ¡c component React (nhÆ° `PartnersTab.tsx`) cÃ³ thá»ƒ `import` vÃ  sá»­ dá»¥ng.
    * `async (id: number)`: Khai bÃ¡o Ä‘Ã¢y lÃ  má»™t hÃ m báº¥t Ä‘á»“ng bá»™ (sáº½ máº¥t thá»i gian chá» server pháº£n há»“i), nháº­n vÃ o má»™t sá»‘ nguyÃªn lÃ  `id` cá»§a Ä‘á»‘i tÃ¡c.
    * `` api(`/admin/partners/${id}/approve`, ...) ``: Gá»i má»™t hÃ m wrapper tÃªn lÃ  `api` (Ä‘Æ°á»£c Ä‘á»‹nh nghÄ©a riÃªng trong dá»± Ã¡n). KÃ½ tá»± backtick `` ` `` giÃºp truyá»n biáº¿n `${id}` trá»±c tiáº¿p vÃ o chuá»—i URL, táº¡o thÃ nh Ä‘Æ°á»ng dáº«n vÃ­ dá»¥: `/admin/partners/5/approve`.
    * `{ method: "POST" }`: Äá»‹nh nghÄ©a phÆ°Æ¡ng thá»©c HTTP lÃ  POST, bÃ¡o cho server biáº¿t Ä‘Ã¢y lÃ  hÃ nh Ä‘á»™ng táº¡o/cáº­p nháº­t dá»¯ liá»‡u chá»© khÃ´ng pháº£i chá»‰ láº¥y dá»¯ liá»‡u (GET). HÃ m `api` nÃ y sáº½ ngáº§m Ä‘á»‹nh tá»± Ä‘á»™ng Ä‘Ã­nh kÃ¨m cÃ¡c Cookie xÃ¡c thá»±c cá»§a Admin vÃ o Request Ä‘á»ƒ server kiá»ƒm tra.

---

### CHáº¶NG 3: Bá»˜ Lá»ŒC Báº¢O Máº¬T & PHÃ‚N QUYá»€N (BACKEND MIDDLEWARE)
TrÆ°á»›c khi nghiá»‡p vá»¥ Ä‘Æ°á»£c thá»±c thi, mÃ¡y chá»§ pháº£i báº£o Ä‘áº£m ngÆ°á»i gá»­i yÃªu cáº§u thá»±c sá»± lÃ  **Admin** há»£p phÃ¡p.

* **Tá»‡p tin thá»±c táº¿:** [auth.middleware.ts](../backend/src/modules/auth/auth.middleware.ts)
* **ÄÆ°á»ng dáº«n má»Ÿ nhanh (Nháº¥p Ä‘á»ƒ nháº£y tháº³ng tá»›i dÃ²ng code):** [auth.middleware.ts: DÃ²ng 82](../backend/src/modules/auth/auth.middleware.ts#L82)
* **DÃ²ng code kÃ­ch hoáº¡t:** (DÃ²ng 82-94)
  ```typescript
  export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const s = await loadVerifiedSession(req.cookies?.["session_admin"])
             || await loadVerifiedSession(req.cookies?.["session"]);
      if (!s) {
        clearAuthCookie(res, "admin");
        return res.status(401).json({ error: "PhiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n" });
      }
      if (s.role !== "admin") return res.status(403).json({ error: "KhÃ´ng cÃ³ quyá»n" });
      req.session = s;
      next(); // VÆ°á»£t qua vÃ²ng báº£o máº­t, Ä‘i tiáº¿p vÃ o controller nghiá»‡p vá»¥
    } catch (e) { next(e); }
  }
  ```
  * **Giáº£i thÃ­ch chi tiáº¿t tá»«ng dÃ²ng code Middleware:**
    * `req, res, next`: Ba tham sá»‘ máº·c Ä‘á»‹nh cá»§a má»i middleware trong Express.js. `req` lÃ  yÃªu cáº§u tá»« client gá»­i lÃªn, `res` lÃ  Ä‘á»‘i tÆ°á»£ng Ä‘á»ƒ tráº£ káº¿t quáº£ vá», `next` lÃ  hÃ m Ä‘á»ƒ bÃ¡o hiá»‡u "Ä‘Ã£ kiá»ƒm tra xong, hÃ£y cháº¡y Ä‘oáº¡n code tiáº¿p theo".
    * `req.cookies?.["session_admin"]`: Dáº¥u `?.` (Optional Chaining) giÃºp chá»‘ng lá»—i sáº­p server náº¿u biáº¿n `req.cookies` bá»‹ undefined (khÃ´ng cÃ³ cookie nÃ o). NÃ³ sáº½ cá»‘ Ä‘á»c cookie mang tÃªn `session_admin`.
    * `await loadVerifiedSession(...)`: HÃ m nÃ y sáº½ giáº£i mÃ£ Cookie, kiá»ƒm tra chá»¯ kÃ½ báº£o máº­t (JWT) vÃ  Ä‘á»‘i chiáº¿u vá»›i database xem tÃ i khoáº£n nÃ y cÃ³ bá»‹ khÃ³a (banned) hay khÃ´ng.
    * `if (!s) return res.status(401)...`: Náº¿u hÃ m trÃªn tráº£ vá» rá»—ng (tá»©c lÃ  cookie háº¿t háº¡n, giáº£ máº¡o, hoáº·c tÃ i khoáº£n bá»‹ khÃ³a), middleware láº­p tá»©c ngáº¯t luá»“ng, tráº£ vá» mÃ£ lá»—i HTTP 401 (Unauthorized - ChÆ°a xÃ¡c thá»±c). Lá»‡nh `return` Ä‘áº£m báº£o code bÃªn dÆ°á»›i khÃ´ng bá»‹ cháº¡y tiáº¿p.
    * `if (s.role !== "admin") return res.status(403)...`: Náº¿u cÃ³ Ä‘Äƒng nháº­p há»£p lá»‡ nhÆ°ng role (vai trÃ²) khÃ´ng pháº£i lÃ  `admin` (vÃ­ dá»¥: customer láº¥y cookie cá»§a mÃ¬nh gá»­i lÃªn), sáº½ bá»‹ cháº·n vÃ  tráº£ vá» lá»—i 403 (Forbidden - Cáº¥m truy cáº­p).
    * `req.session = s;`: Gáº¯n thÃ´ng tin tÃ i khoáº£n há»£p lá»‡ (gá»“m `userId` vÃ  `role`) vÃ o biáº¿n `req`. Nhá» dÃ²ng nÃ y, cÃ¡c hÃ m phÃ­a sau cÃ³ thá»ƒ dá»… dÃ ng biáº¿t ai Ä‘ang thá»±c hiá»‡n hÃ nh Ä‘á»™ng.
    * `next();`: DÃ²ng quan trá»ng nháº¥t cá»§a middleware thÃ nh cÃ´ng. Gá»i hÃ m nÃ y Ä‘á»ƒ bÃ¡o cho Express chuyá»ƒn yÃªu cáº§u (request) Ä‘i qua chá»‘t gÃ¡c báº£o máº­t, tiáº¿n vÃ o hÃ m xá»­ lÃ½ nghiá»‡p vá»¥ chÃ­nh.

---

### CHáº¶NG 4: ÄÆ¯á»œNG DáºªN & Xá»¬ LÃ NGHIá»†P Vá»¤ (BACKEND ROUTE & CONTROLLER)
Khi request an toÃ n Ä‘i qua Middleware, Backend sáº½ Ä‘á»‹nh tuyáº¿n vÃ  xá»­ lÃ½ nghiá»‡p vá»¥ phÃª duyá»‡t Ä‘á»‘i tÃ¡c.

* **Tá»‡p tin thá»±c táº¿:** [partners.routes.ts](../backend/src/modules/partners/partners.routes.ts)
* **ÄÆ°á»ng dáº«n má»Ÿ nhanh (Nháº¥p Ä‘á»ƒ nháº£y tháº³ng tá»›i dÃ²ng code):** [partners.routes.ts: DÃ²ng 60](../backend/src/modules/partners/partners.routes.ts#L60)
* **DÃ²ng code kÃ­ch hoáº¡t:** (DÃ²ng 60-68)
  ```typescript
  router.post("/admin/partners/:id/approve", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await pool.query(
        "UPDATE partner_profiles SET kyc_status = 'approved', reject_reason = NULL WHERE user_id = ?",
        [req.params.id]
      );
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  ```
  * **Giáº£i thÃ­ch chi tiáº¿t tá»«ng dÃ²ng code Controller:**
    * `router.post("/admin/partners/:id/approve", requireAdmin, async (...) => {...})`: Khai bÃ¡o má»™t Ä‘Æ°á»ng dáº«n API. NÃ³ quy Ä‘á»‹nh 3 thá»©: (1) PhÆ°Æ¡ng thá»©c lÃ  POST, (2) Náº¿u URL khá»›p vá»›i máº«u cÃ³ tham sá»‘ Ä‘á»™ng `:id`, (3) Pháº£i Ä‘i qua chá»‘t gÃ¡c `requireAdmin` trÆ°á»›c khi cháº¡y hÃ m `async`.
    * `req.params.id`: TrÃ­ch xuáº¥t cÃ¡i ID mÃ  frontend gá»­i lÃªn trong URL. VÃ­ dá»¥ URL lÃ  `/admin/partners/15/approve`, thÃ¬ `req.params.id` sáº½ mang giÃ¡ trá»‹ `"15"`.
    * `await pool.query(...)`: Láº¥y má»™t káº¿t ná»‘i tá»« "Há»“ chá»©a káº¿t ná»‘i" (Connection Pool) cá»§a PostgreSQL vÃ  yÃªu cáº§u nÃ³ cháº¡y cÃ¢u lá»‡nh SQL. Lá»‡nh `await` báº¯t server chá» cho Ä‘áº¿n khi PostgreSQL thá»±c thi xong má»›i cháº¡y tiáº¿p.
    * `[req.params.id]`: Máº£ng nÃ y chá»©a cÃ¡c giÃ¡ trá»‹ sáº½ Ä‘Æ°á»£c nhÃ©t vÃ o vá»‹ trÃ­ dáº¥u `?` trong cÃ¢u SQL á»Ÿ trÃªn. Viá»‡c dÃ¹ng dáº¥u `?` vÃ  truyá»n tham sá»‘ qua máº£ng tháº¿ nÃ y Ä‘Æ°á»£c gá»i lÃ  "Prepared Statement", giÃºp **chá»‘ng láº¡i cÃ¡c cuá»™c táº¥n cÃ´ng SQL Injection** (Tin táº·c khÃ´ng thá»ƒ tiÃªm mÃ£ Ä‘á»™c vÃ o `req.params.id` Ä‘á»ƒ phÃ¡ DB).
    * `res.json({ ok: true });`: Lá»‡nh cuá»‘i cÃ¹ng tráº£ vá» cho Frontend má»™t pháº£n há»“i (Response) dáº¡ng chuá»—i JSON bÃ¡o hiá»‡u má»i thá»© Ä‘Ã£ thÃ nh cÃ´ng tá»‘t Ä‘áº¹p. LÃºc nÃ y frontend sáº½ nháº­n Ä‘Æ°á»£c {ok: true} vÃ  cháº¡y block `onSuccess` Ä‘á»ƒ lÃ m má»›i mÃ n hÃ¬nh.

---

### CHáº¶NG 5: Cáº¬P NHáº¬T CÆ  Sá»ž Dá»® LIá»†U (DATABASE LAYER)
HÃ nh Ä‘á»™ng cuá»‘i cÃ¹ng diá»…n ra trong há»‡ quáº£n trá»‹ cÆ¡ sá»Ÿ dá»¯ liá»‡u PostgreSQL:

```sql
UPDATE partner_profiles 
   SET kyc_status = 'approved', 
       reject_reason = NULL 
 WHERE user_id = ?;
```
* **Giáº£i thÃ­ch Ã½ nghÄ©a nghiá»‡p vá»¥ cá»§a dá»¯ liá»‡u:**
  1. `kyc_status = 'approved'`: ÄÃ¡nh dáº¥u tráº¡ng thÃ¡i kiá»ƒm duyá»‡t há»“ sÆ¡ KYC Ä‘á»‘i tÃ¡c Ä‘Ã£ thÃ nh cÃ´ng. Tá»« thá»i Ä‘iá»ƒm nÃ y trá»Ÿ Ä‘i, tÃ i khoáº£n Ä‘á»‘i tÃ¡c cÃ³ thá»ƒ Ä‘Äƒng nháº­p vÃ o phÃ¢n há»‡ `apps/partner` Ä‘á»ƒ Ä‘Äƒng bÃ i vÃ  quáº£n lÃ½ khÃ¡ch sáº¡n cá»§a há».
  2. `reject_reason = NULL`: XoÃ¡ bá» lÃ½ do tá»« chá»‘i trÆ°á»›c Ä‘Ã³ (náº¿u cÃ³) Ä‘á»ƒ há»“ sÆ¡ sáº¡ch sáº½.
  3. `WHERE user_id = ?`: RÃ ng buá»™c chÃ­nh xÃ¡c Ä‘á»‘i tÃ¡c cáº§n duyá»‡t theo ID Ä‘Æ°á»£c truyá»n lÃªn tá»« URL cá»§a frontend.

---

## ðŸ’¡ TÆ¯ DUY THIáº¾T Káº¾ Cá»¦A Há»† THá»NG NÃ€Y (Key Takeaways)

1. **PhÃ¢n quyá»n cháº·t cháº½ thÃ´ng qua Cookie & Session**: Logic kiá»ƒm tra cookie Ä‘Æ°á»£c Ä‘Ã³ng gÃ³i gá»n gÃ ng thÃ nh má»™t Middleware (`requireAdmin`). Báº¡n chá»‰ cáº§n khai bÃ¡o middleware nÃ y Ä‘á»©ng trÆ°á»›c Controller (á»Ÿ dÃ²ng 60) lÃ  endpoint Ä‘Ã³ Ä‘Ã£ Ä‘Æ°á»£c báº£o vá»‡ tuyá»‡t Ä‘á»‘i.
2. **Quáº£n lÃ½ state báº¥t Ä‘á»“ng bá»™ thÃ´ng minh báº±ng React Query**: á»ž Frontend, thay vÃ¬ viáº¿t code thá»§ cÃ´ng quáº£n lÃ½ tráº¡ng thÃ¡i loading, error hay re-fetch dá»¯ liá»‡u, há»‡ thá»‘ng sá»­ dá»¥ng React Query (`useMutation`). Lá»£i Ã­ch lá»›n nháº¥t lÃ  sau khi API approve thÃ nh cÃ´ng, hÃ m `invalidateQueries(['partners'])` sáº½ tá»± Ä‘á»™ng kÃ­ch hoáº¡t láº¥y láº¡i danh sÃ¡ch Ä‘á»‘i tÃ¡c má»›i nháº¥t giÃºp UI luÃ´n Ä‘á»“ng bá»™ mÃ  khÃ´ng cáº§n táº£i láº¡i trang.
3. **Database tá»‘i giáº£n, hiá»‡u quáº£**: Tráº¡ng thÃ¡i KYC cá»§a Ä‘á»‘i tÃ¡c Ä‘Æ°á»£c tÃ¡ch ra báº£ng `partner_profiles` thay vÃ¬ gá»™p chung vÃ o báº£ng `users`. Äiá»u nÃ y giÃºp báº£ng `users` luÃ´n nháº¹ nhÃ ng, tá»‘i Æ°u tá»‘c Ä‘á»™ Ä‘á»c khi Ä‘Äƒng nháº­p há»‡ thá»‘ng nÃ³i chung.

