# Hotel Importer Tool

Mini app rieng de tao SQL khach san tu Agoda URL. Tool chi nam trong `tools/hotel-importer`, khong dung vao code chinh cua du an.

## Chay giao dien

```bash
cd tools/hotel-importer
pnpm start
```

Mo:

```text
http://localhost:4317
```

## Luong tren giao dien moi

Giao dien chia thanh 4 tab de tranh roi:

1. `Tim`: nhap thanh pho va so luong, bam `Tim hang loat`.
2. `Batch`: bam `Chay batch tiep theo`; ket qua tu luu vao store.
3. `Review`: loc, approve hoac reject khach san.
4. `Export`: bam `Export SQL approved` de lay SQL cuoi.

Phan nhap URL thu cong, sua preview, va SQL preview duoc dua vao muc nang cao.

## Input

Moi dong co the chi can URL:

```text
https://www.agoda.com/vi-vn/signature-by-m-village-th-nhu-m/hotel/hanoi-vn.html
```

Hoac day du hon:

```text
url,hotel_name,city,country_code
```

## Output

Sau khi chay, tool tao:

- `output/input.csv`: input da chuan hoa tu UI.
- `output/import-report.json`: thong ke, confidence, va cac field da duoc fill.
- `output/import-preview.sql`: SQL preview de xem truoc.
- `output/saved/apply.sql`: SQL da bam luu, duoc cong don vao mot file chung.
- `output/saved/input.csv`: cac URL/record da luu, dung de chan link trung.
- `output/saved/history.json`: lich su cac lan luu.
- `output/store/index.json`: kho trung gian theo tung khach san, dung cho batch/review ve sau.
- `output/store/hotels/agoda-<hotel_id>.json`: ban ghi day du cua tung khach san, gom editable data, quality score, SQL preview va input.
- `output/store/queue.json`: hang doi batch de them nhieu Agoda URL, retry/resume sau khi tat tool.

Tool khong tao `output/runs` nua. Cac lan tai du lieu chi cap nhat file preview hien tai; chi khi bam `Luu du lieu` moi cong vao `output/saved`.

Moi khach san trong report/store co `quality`:

- `score`: diem chat luong 0-100.
- `level`: `ready_for_batch`, `review`, hoac `needs_work`.
- `checks`: cac dieu kien nhu co Agoda hotel id, co anh Agoda, du anh, nhieu hang phong, du nearby.

Muc tieu cho import hang loat la chi export/apply nhung khach san co `quality.level = ready_for_batch` hoac da duoc review tay.

Moi khach san trong report/store co them:

- `schemaVersion`: phien ban schema chuan cua tool.
- `schema`: cac nhom field bat buoc/nen co cho property, content, rooms, policies.
- `fieldSources`: nguon cua tung field:
  - `agoda`: lay truc tiep tu Agoda/public API cua Agoda.
  - `osm`: lay tu OpenStreetMap/Nominatim/Overpass.
  - `generated`: tool tu dien/fallback.
  - `manual`: ban nhap hoac sua tay tren UI.

Quality score se ha diem neu cac field quan trong nhu dia chi, toa do, anh, room, nearby bi gan la `generated`.

## Hang doi batch

Tren giao dien co khu `Hang doi batch`:

1. Tim/nhap Agoda URL.
2. Bam `Them vao hang doi`.
3. Hoac nhap thanh pho + so luong, bam `Tim hang loat` de tool tu tim Agoda hotel id va them vao queue.
4. Chon batch size, mac dinh 25 khach san/lanchay, roi bam `Chay batch`.
5. Dung `Xoa hang doi` neu muon lam lai queue; nut nay khong xoa store/saved da luu.
6. Tool ghi trang thai tung khach san vao `output/store/queue.json`.

Sau moi lan `Chay batch`, tool tu luu ket qua vao `output/store/hotels/*.json`. Ban khong can bam `Luu du lieu` de giu batch do nua. Nut `Luu du lieu` chi con phu hop khi ban dang xem/sua preview hien tai va muon cong vao file `output/saved/apply.sql`.

Hang doi co retry toi da 3 lan cho record loi, skip duplicate theo `agoda_hotel_id`, va van con sau khi restart server.

## Review va export

Khu `Dashboard review` doc tu `output/store/index.json`:

- Loc theo ten/thanh pho, trang thai review, hoac quality duoi 70.
- Bam `Approve` cho khach san dat yeu cau.
- Bam `Reject` cho khach san khong dung/qua kem.
- Bam `Export SQL approved` de sinh SQL chi tu cac khach san da approve.

File export nam o:

- `output/approved/input-approved.csv`
- `output/approved/report-approved.json`
- `output/approved/apply-approved.sql`

Dia diem gan day duoc tao toi da 15 dia diem theo dung cach app hien thi: 5 muc giao thong/tien ich, 5 muc du lich, 5 muc dia diem gan day nhu nha hang/ca phe. Neu nguon that thieu, tool se dien fallback de ban sua tren giao dien truoc khi luu.

Anh khach san va anh phong uu tien lay dung tu Agoda public API (`pix8.agoda.net/hotelImages`). Neu Agoda khong tra duoc anh, tool moi fallback sang nguon public that khac nhu website chinh thuc hoac Trip.com/Trip CDN. Tool khong chen anh stock/Unsplash nua; neu khong lay duoc anh that thi report se can review va de trong de ban sua.

Moi khach san co the co nhieu hang phong trong truong `room_options` theo format:

```text
Ten phong:gia:m2:suc chua:giuong:so phong:anh1;anh2|Ten phong 2:gia:m2:suc chua:giuong:so phong:anh1;anh2
```

Khi sinh SQL PostgreSQL, moi hang phong trong `room_options` se duoc map vao `room_types`, `rate_plans` va `daily_rates`. Anh se duoc nap vao `property_media`, tien ich vao `amenities` va `property_amenities`.

## CLI nhanh

Neu muon chay khong qua UI:

```bash
npm run import
```

Lenh nay doc `output/input.csv` va sinh lai SQL/report.

## Ghi chu

- Agoda co the chan hoac tra thieu HTML, nen tool se fallback sang search/geocode/du lieu mau cho field thieu.
- Cac field tu dien nam trong `filledFields`; day la phan khong nen coi la du lieu Agoda chinh xac 100%.
