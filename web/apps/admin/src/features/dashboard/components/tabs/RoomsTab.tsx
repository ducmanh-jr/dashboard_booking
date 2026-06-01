import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchRooms, approveRoom, updateRoom, approveRoomRequest, rejectRoomRequest, rejectRoom, deleteRoom } from "../../../../api/roomsApi";
import { Room, RoomChangeRequest, Price, NearbyPlace, TransportConnection } from "@/shared/types";
import { cn } from "@/shared/components/ui";
import { RoomEditModal } from "../modals/RoomEditModal";
import { useConfirmDialog } from "../../../../shared/components/ConfirmDialog";
import { ADMIN_PORTAL_NAME } from "../../../../shared/config/pageTitles";
import { usePageTitle } from "../../../../shared/hooks/usePageTitle";

function fmtVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function isArchivedRoom(room: Room) {
  return room.isArchived || room.status === "suspended" || room.status === "archived";
}

function roomStatusLabel(room: Room) {
  if (isArchivedRoom(room)) return "Ngừng hoạt động";
  if (room.status === "pending" || room.status === "pending_review") return "Chờ duyệt";
  if (room.status === "approved" || room.status === "active") return "Đã duyệt";
  if (room.status === "rejected") return "Từ chối";
  return room.status;
}

function roomStatusClass(room: Room) {
  if (isArchivedRoom(room)) return "bg-slate-100 text-slate-600";
  if (room.status === "approved" || room.status === "active") return "bg-green-100 text-green-700";
  if (room.status === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function requestTypeLabel(room: Room) {
  if (!room.pendingRequest) return "";
  switch (room.pendingRequest.action) {
    case "create": return "Yêu cầu tạo mới";
    case "update": return "Yêu cầu thay đổi";
    case "delete": return "Yêu cầu xóa";
    default: return "";
  }
}

function RequestPayloadPreview({ request }: { request: RoomChangeRequest | null }) {
  if (!request) return null;
  if (request.action === "delete") {
    return (
      <div className="mt-4 border rounded-lg p-4 bg-amber-50 border-amber-200 text-sm text-amber-800">
        Đối tác đã gửi yêu cầu xóa phòng này.
      </div>
    );
  }

  const payload = request.payload || {};
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  const amenities = Array.isArray(payload.amenities) ? payload.amenities : [];
  const nearbyPlaces = Array.isArray(payload.nearbyPlaces) ? payload.nearbyPlaces : [];

  return (
    <div className="mt-4 border rounded-lg p-4 space-y-3">
      <div className="font-semibold">Nội dung đối tác gửi để duyệt</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Tên:</span> {payload.name || "-"}</div>
        <div><span className="text-muted-foreground">Loại:</span> {payload.roomType || "-"}</div>
        <div><span className="text-muted-foreground">Sức chứa:</span> {payload.capacity || "-"}</div>
        <div><span className="text-muted-foreground">Diện tích:</span> {payload.area ?? "-"} m²</div>
        <div><span className="text-muted-foreground">Phí nền tảng:</span> {payload.platformFeePct ?? "-"}%</div>
        <div><span className="text-muted-foreground">Khuyến mãi:</span> {payload.promotionPct ?? "-"}%</div>
        <div className="col-span-2"><span className="text-muted-foreground">Địa chỉ:</span> {payload.address || "-"}</div>
      </div>
      {payload.description && <div className="text-sm text-muted-foreground">{payload.description}</div>}
      <div>
        <div className="text-sm font-medium mb-1">Danh sách phòng mới</div>
        <div className="space-y-3">
          {prices.length === 0 && <div className="text-sm text-muted-foreground">Không có dữ liệu phòng</div>}
          {prices.map((price: Price, index: number) => (
            <div key={index} className="border rounded-md p-3 bg-muted/10">
              <div className="flex justify-between font-medium text-sm">
                <span>{price.label}</span>
                <span className="text-primary">{fmtVnd(Number(price.pricePerNight) || 0)}/đêm</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground mt-2 border-t pt-2">
                <div>• Diện tích: {price.area || "-"} m2</div>
                <div>• Sức chứa: {price.capacity || "-"} người</div>
                {price.amenities && <div className="col-span-2 italic">• Tiện ích: {price.amenities.split(",").filter(a => !a.toLowerCase().includes("agoda source")).join(", ")}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Tiện ích</div>
        <div className="flex flex-wrap gap-1">
          {amenities.length === 0 && <span className="text-sm text-muted-foreground">Không có</span>}
          {amenities
            .filter((item: string) => !item.toLowerCase().includes("agoda source"))
            .map((item: string, index: number) => <span key={index} className="text-xs px-2 py-0.5 rounded bg-secondary">{item}</span>)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Địa điểm lân cận ({nearbyPlaces.length})</div>
        <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
          {nearbyPlaces.map((place: NearbyPlace, index: number) => (
            <li key={index}>• {place.name} <span className="text-muted-foreground">({place.type}, {place.distanceM}m)</span></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Điểm nổi bật</div>
        <div className="flex flex-wrap gap-1">
          {(payload.highlights || []).length === 0 && <span className="text-sm text-muted-foreground">Không có</span>}
          {(payload.highlights || [])
            .filter((item: string) => !item.toLowerCase().includes("agoda source"))
            .map((item: string, index: number) => <span key={index} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{item}</span>)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Kết nối giao thông</div>
        <ul className="text-xs space-y-1">
          {(payload.transportConnections || []).length === 0 && <li className="text-muted-foreground">Không có dữ liệu</li>}
          {(payload.transportConnections || []).map((tc: TransportConnection, index: number) => (
            <li key={index}>• <span className="font-medium">{tc.name}</span>: {tc.distance} {tc.note && <span className="text-muted-foreground italic">({tc.note})</span>}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const roomCache: Record<string, Room[]> = {};

export function RoomsTab({ initialFilter = "pending" }: { initialFilter?: string }) {
  const locState = useLocation().state as any;
  const navigate = useNavigate();
  const startingFilter = locState?.filter || initialFilter;
  const [filter, setFilter] = useState(startingFilter);
  const [targetId, setTargetId] = useState<number | null>(locState?.targetId || null);
  const [shouldHighlight, setShouldHighlight] = useState(Boolean(locState?.highlight));

  const [list, setList] = useState<Room[]>(() => roomCache[startingFilter] || []);
  const [detail, setDetail] = useState<Room | null>(() => {
    if (locState?.targetId && roomCache[startingFilter]) {
      return roomCache[startingFilter].find(r => Number(r.id) === Number(locState.targetId)) || null;
    }
    return null;
  });

  useEffect(() => {
    if (locState?.targetId && locState?.highlight) {
      setShouldHighlight(true);
      const timer = setTimeout(() => {
        setShouldHighlight(false);
        setTargetId(null);
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [locState]);

  useEffect(() => {
    if (targetId && list.length > 0 && !detail) {
      const targetRoom = list.find((r) => Number(r.id) === Number(targetId));
      if (targetRoom) {
        setDetail(targetRoom);
      }
    }
  }, [targetId, list, detail]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reject, setReject] = useState<{ id: number; reason: string; requestId?: number } | null>(null);
  const [editing, setEditing] = useState<Room | null>(null);
  const [selectedRoomPrice, setSelectedRoomPrice] = useState<Price | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const { confirm, confirmDialog } = useConfirmDialog();
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);
  usePageTitle({ title: "Khách sạn", entity: detail?.name, portal: ADMIN_PORTAL_NAME, restoreOnUnmount: false });

  const filteredList = useMemo(() => {
    let result = [...list];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => (r.name || "").toLowerCase().includes(q) || (r.partnerHotelName || "").toLowerCase().includes(q) || (r.partnerEmail || "").toLowerCase().includes(q));
    }
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: string | number | boolean | null | undefined = a[sortConfig.key as keyof Room] as any;
        let bVal: string | number | boolean | null | undefined = b[sortConfig.key as keyof Room] as any;
        if (sortConfig.key === 'minPrice') {
          aVal = a.prices.length ? Math.min(...a.prices.map(p => p.pricePerNight)) : 0;
          bVal = b.prices.length ? Math.min(...b.prices.map(p => p.pricePerNight)) : 0;
        }
        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [list, search, sortConfig]);


  useEffect(() => {
    // page reset logic removed as pagination is removed
  }, [search, filter]);

  function requestSort(key: string) {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }



  async function load() {
    if (!roomCache[filter] || roomCache[filter].length === 0) {
      setLoading(true);
    }
    setErr("");
    try {
      const result = await fetchRooms(filter);
      const rooms = result.rooms || [];
      roomCache[filter] = rooms;
      setList(rooms);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (roomCache[filter]) {
      setList(roomCache[filter]);
    }
    load();
  }, [filter]);

  async function approve(room: Room) {
    try {
      if (room.pendingRequest) {
        await approveRoomRequest(room.pendingRequest.id);
      } else {
        await approveRoom(room.id);
      }
      await load();
      setDetail(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function doReject() {
    if (!reject) return;
    try {
      if (reject.requestId) {
        await rejectRoomRequest(reject.requestId, reject.reason);
      } else {
        await rejectRoom(reject.id, reject.reason);
      }
      setReject(null);
      await load();
      setDetail(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function removeRoom(room: Room) {
    if (room.pendingRequest) {
      alert("Khách sạn đang có yêu cầu đối tác chờ duyệt. Hãy xử lý yêu cầu trước.");
      return;
    }
    const ok = await confirm({
      title: "Ngừng hoạt động khách sạn",
      message: `Khách sạn "${room.name}" sẽ chuyển sang trạng thái ngừng hoạt động.`,
      confirmText: "Ngừng hoạt động",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteRoom(room.id);
      await load();
      setDetail(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    if (roomCache[newFilter]) {
      setList(roomCache[newFilter]);
    } else {
      setList([]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2">
          {[["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Đã từ chối"], ["archived", "Ngừng hoạt động"]].map(([key, label]) => (
            <button key={key} onClick={() => handleFilterChange(key)} className={`px-4 py-2 rounded-md text-sm border ${filter === key ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm" : "bg-card hover:bg-accent text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); e.currentTarget.querySelector('input')?.blur(); }} className="relative w-full sm:w-80">
          <input
            placeholder="Tìm khách sạn (Tên, Đối tác, Email)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 border rounded-md text-sm w-full bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </form>
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}

      <div className={`bg-card border rounded-lg overflow-hidden transition-opacity duration-200 ${loading && filteredList.length > 0 ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 cursor-pointer hover:bg-accent select-none" onClick={() => requestSort('name')}>Khách sạn <SortIcon columnKey="name" sortConfig={sortConfig} /></th>
              <th className="px-4 py-2.5 cursor-pointer hover:bg-accent select-none" onClick={() => requestSort('partnerHotelName')}>Đối tác <SortIcon columnKey="partnerHotelName" sortConfig={sortConfig} /></th>
              <th className="px-4 py-2.5 cursor-pointer hover:bg-accent select-none" onClick={() => requestSort('roomType')}>Hạng sao <SortIcon columnKey="roomType" sortConfig={sortConfig} /></th>
              <th className="px-4 py-2.5 cursor-pointer hover:bg-accent select-none" onClick={() => requestSort('minPrice')}>Giá thấp nhất <SortIcon columnKey="minPrice" sortConfig={sortConfig} /></th>
              <th className="px-4 py-2.5 cursor-pointer hover:bg-accent select-none" onClick={() => requestSort('createdAt')}>Ngày tạo <SortIcon columnKey="createdAt" sortConfig={sortConfig} /></th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-2.5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-medium">Đang tải dữ liệu...</td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-medium">Không có dữ liệu</td>
              </tr>
            ) : (
              filteredList.map((room) => {
                const minPrice = room.prices.length ? Math.min(...room.prices.map(p => p.pricePerNight)) : 0;
                return (
                  <tr key={room.id} className={`border-t hover:bg-muted/30 transition-colors ${isArchivedRoom(room) ? "opacity-60 bg-slate-50" : ""}`}>
                    <td className="px-4 py-3 font-medium">{room.name}</td>
                    <td className="px-4 py-3">
                      <div>{room.partnerHotelName || "-"}</div>
                      <div className="text-[10px] text-muted-foreground">{room.partnerEmail}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{String(room.roomType || "").includes("sao") ? room.roomType : `${room.roomType || "0"} sao`}</td>
                    <td className="px-4 py-3">{fmtVnd(minPrice)}</td>
                    <td className="px-4 py-3" suppressHydrationWarning>{new Date(room.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase w-fit ${roomStatusClass(room)}`}>{roomStatusLabel(room)}</span>
                        {room.pendingRequest && (
                          <span className="text-[9px] text-primary font-bold italic">
                            ({requestTypeLabel(room)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 space-x-1 whitespace-nowrap text-right">
                      <button onClick={() => setDetail(room)} className="px-2 py-1 text-xs rounded border hover:bg-accent font-medium">Chi tiết</button>
                      {filter === "pending" && !isArchivedRoom(room) && (
                        <>
                          <button onClick={() => approve(room)} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground font-medium hover:opacity-90">Duyệt</button>
                          <button onClick={() => setReject({ id: room.id, requestId: room.pendingRequest?.id, reason: "" })} className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground font-medium hover:opacity-90">Từ chối</button>
                        </>
                      )}
                      {filter !== "pending" && (
                        <button onClick={() => removeRoom(room)} disabled={isArchivedRoom(room)} className="px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">Ngừng hoạt động</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-[60] overflow-y-auto" onClick={() => setDetail(null)}>
          <div className={`bg-card border rounded-lg w-full max-w-6xl my-8 flex flex-col h-[85vh] overflow-hidden shadow-2xl transition-all duration-300 ${shouldHighlight ? "ring-4 ring-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]" : ""}`} onClick={(event) => event.stopPropagation()}>
            <div className="p-6 border-b shrink-0 flex items-start justify-between bg-background/50 backdrop-blur-sm gap-4">
              <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        if (locState?.fromTab) {
                          navigate(`/${locState.fromTab}`, { state: { targetPropertyId: locState.fromTargetPropertyId } });
                        } else {
                          navigate(-1);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm bg-white"
                      title="Quay lại"
                    >
                      <svg className="size-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Quay lại
                    </button>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-primary truncate">{detail.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                    <span>{detail.city || detail.partnerHotelName || "Hà Nội"}</span>
                    <span>•</span>
                    <span>{String(detail.roomType || "").includes("sao") ? detail.roomType : `${detail.roomType || "0"} sao`}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!detail.pendingRequest && (
                  <>
                    <button onClick={() => { setEditing(detail); setDetail(null); }} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">Sửa</button>
                    <button onClick={() => removeRoom(detail)} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm">Xóa</button>
                  </>
                )}
                  {filter === "pending" && !isArchivedRoom(detail) && (detail.status === "pending" || detail.status === "pending_review" || detail.pendingRequest) && (
                  <>
                    <button onClick={() => approve(detail)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Duyệt</button>
                    <button onClick={() => setReject({ id: detail.id, requestId: detail.pendingRequest?.id, reason: "" })} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm">Từ chối</button>
                  </>
                )}
                <button onClick={() => setDetail(null)} className="p-2 hover:bg-muted rounded-full">
                  <span className="text-xl leading-none">X</span>
                </button>
              </div>
            </div>

            <div className="flex border-b overflow-x-auto no-scrollbar bg-background shrink-0 px-2 items-center justify-between">
              <div className="flex">
                {[
                  { id: "overview", label: "Tổng quan" },
                  { id: "rooms", label: "Phòng nghỉ" },
                  { id: "facilities", label: "Cơ sở vật chất" },
                  { id: "location", label: "Vị trí" },
                  { id: "policy", label: "Chính sách" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      const el = document.getElementById(`rt-modal-sec-${tab.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                Về đầu trang ^
              </button>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto p-6 space-y-12 scroll-smooth">
              <section id="rt-modal-sec-overview" className="space-y-6">
                <h4 className="text-lg font-bold border-b pb-2 text-primary">Tổng quan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/10 text-center">
                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Đối tác</div>
                    <div className="font-bold text-primary truncate">{detail.partnerEmail}</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/10 text-center">
                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Trạng thái</div>
                    <div className="font-bold text-primary">{detail.pendingRequest ? "Đang có yêu cầu" : roomStatusLabel(detail)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-sm">Mô tả khách sạn</h5>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail.description || "Chưa có mô tả"}</p>
                </div>

                {detail.highlights && detail.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-sm">Điểm nổi bật</h5>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {detail.highlights
                        .filter(h => !h.toLowerCase().includes("agoda source"))
                        .map((item) => (
                          <span key={item} className="text-xs px-2 py-1 rounded-full border bg-background">
                            {item}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h5 className="font-semibold text-sm">Ảnh khách sạn ({detail.images?.length || 0})</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detail.images.map((img, index) => (
                      <div key={index} className="aspect-video rounded-lg overflow-hidden border group relative">
                        <img src={img.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[10px] text-white bg-black/40 px-2 py-0.5 rounded">{img.category || "Khác"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {detail.pendingRequest && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-bold mb-2">Dự kiến thay đổi (Yêu cầu mới):</div>
                    <RequestPayloadPreview request={detail.pendingRequest} />
                  </div>
                )}
              </section>

              <section id="rt-modal-sec-rooms" className="space-y-6">
                <h4 className="text-lg font-bold border-b pb-2 text-primary">Phòng nghỉ</h4>
                <div className="grid gap-4">
                  {detail.prices.map((price: Price, index: number) => (
                    <div key={index} onClick={() => setSelectedRoomPrice(price)} className="border rounded-lg overflow-hidden hover:border-primary cursor-pointer transition-all shadow-sm bg-muted/5 flex flex-col md:flex-row group">
                      {(price.imageUrls && price.imageUrls.length > 0) && (
                        <div className="md:w-64 aspect-video md:aspect-square shrink-0 border-b md:border-b-0 md:border-r overflow-hidden bg-muted relative">
                          <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {(price.imageUrls && price.imageUrls.length > 0 ? price.imageUrls : []).map((url: string, uIdx: number) => (
                              <img key={uIdx} src={url} alt={price.label} className="w-full h-full object-cover shrink-0 snap-start transition-transform duration-500 group-hover:scale-105" />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-bold text-lg group-hover:text-primary transition-colors">{price.label}</h5>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">Diện tích: {price.area || "-"} m2</span>
                                <span className="flex items-center gap-1">Tối đa: {price.capacity || "-"} người</span>
                                {price.bedInfo && <span className="text-primary font-medium flex items-center gap-1">Giường: {price.bedInfo}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-primary font-bold text-lg">{fmtVnd(price.pricePerNight)}</div>
                              <div className="text-[10px] text-muted-foreground">/ đêm</div>
                            </div>
                          </div>
                          {price.amenities && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {price.amenities.split(",").map((a: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground border border-secondary">
                                  {a.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="rt-modal-sec-facilities" className="space-y-6">
                <h4 className="text-lg font-bold border-b pb-2 text-primary">Cơ sở vật chất</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {detail.amenities
                    .filter(a => !a.toLowerCase().includes("agoda source"))
                    .map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-muted/5 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                        <span className="text-sm font-medium">{item}</span>
                      </div>
                    ))}
                </div>
              </section>

              <section id="rt-modal-sec-location" className="space-y-8">
                <h4 className="text-lg font-bold border-b pb-2 text-primary">Vị trí</h4>
                <div className="space-y-4">
                  <h5 className="font-bold text-xl">{detail.city || "Vị trí khách sạn"}</h5>
                  <p className="text-muted-foreground text-sm">{detail.address}</p>
                  <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                    <div className="px-3 py-1 rounded border">Lat: {detail.latitude}</div>
                    <div className="px-3 py-1 rounded border">Long: {detail.longitude}</div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-xl text-foreground">Đi đâu gần đây</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <h6 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Giao thông & Tiện ích</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter(p => ["Sân bay", "Ga tàu", "Bến xe", "Y tế", "Nhà thuốc", "Ngân hàng", "ATM", "Cây xăng", "Chợ", "TTTM", "Siêu thị", "Tiện lợi"].includes(p.type)).map((place, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-tighter opacity-60">{place.type} · {place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h6 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Địa danh nổi tiếng</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter(p => p.type === "Du lịch").map((place, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-tighter opacity-60">{place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h6 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Địa danh gần đây</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter(p => !["Sân bay", "Ga tàu", "Bến xe", "Y tế", "Nhà thuốc", "Ngân hàng", "ATM", "Cây xăng", "Chợ", "TTTM", "Siêu thị", "Tiện lợi", "Du lịch"].includes(p.type)).map((place, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-tighter opacity-60">{place.type} · {place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="rt-modal-sec-policy" className="space-y-6 pb-10">
                <h4 className="text-lg font-bold border-b pb-2 text-primary">Chính sách</h4>
                {detail.policy ? (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/5">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Giờ nhận phòng</div>
                        <div className="font-medium">{detail.policy.checkInTime || "--:--"}</div>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/5">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Giờ trả phòng</div>
                        <div className="font-medium">{detail.policy.checkOutTime || "--:--"}</div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="p-4 rounded-lg border flex items-center justify-between">
                        <span className="font-medium">Hoàn tiền</span>
                        <span className={`text-xs font-bold ${detail.policy.refundable ? "text-green-600" : "text-red-600"}`}>
                          {detail.policy.refundable ? "CÓ" : "KHÔNG"}
                        </span>
                      </div>
                      <div className="p-4 rounded-lg border flex items-center justify-between">
                        <span className="font-medium">Vật nuôi</span>
                        <span className={`text-xs font-bold ${detail.policy.petAllowed ? "text-green-600" : "text-red-600"}`}>
                          {detail.policy.petAllowed ? "CHO PHÉP" : "KHÔNG"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Chưa có thông tin chính sách</p>
                )}
              </section>
            </div>

            {selectedRoomPrice && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedRoomPrice(null)}>
                <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="relative h-64 md:h-80 bg-muted">
                    <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                      {(selectedRoomPrice.imageUrls && selectedRoomPrice.imageUrls.length > 0 ? selectedRoomPrice.imageUrls : []).map((url: string, idx: number) => (
                        <img key={idx} src={url} alt="" className="w-full h-full object-cover shrink-0 snap-start" />
                      ))}
                    </div>
                    <button onClick={() => setSelectedRoomPrice(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">X</button>
                    {selectedRoomPrice.imageUrls && selectedRoomPrice.imageUrls.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-[10px] rounded-full backdrop-blur-md">
                        Cuộn ngang để xem {selectedRoomPrice.imageUrls.length} ảnh
                      </div>
                    )}
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{selectedRoomPrice.label}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">{fmtVnd(selectedRoomPrice.pricePerNight)}</span>
                        <span className="text-sm text-muted-foreground">/ đêm</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 py-4 border-y">
                      <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Diện tích</div>
                        <div className="font-semibold">{selectedRoomPrice.area || "-"} m2</div>
                      </div>
                      <div className="text-center border-x">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sức chứa</div>
                        <div className="font-semibold">{selectedRoomPrice.capacity || "-"} người</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Giường</div>
                        <div className="font-semibold">{selectedRoomPrice.bedInfo || "-"}</div>
                      </div>
                    </div>
                    {selectedRoomPrice.amenities && (
                      <div className="space-y-3">
                        <div className="text-xs uppercase font-bold text-muted-foreground">Tiện ích phòng nghỉ</div>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedRoomPrice.amenities.split(",").map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {item.trim()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-muted/5 flex justify-end">
                    <button onClick={() => setSelectedRoomPrice(null)} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors">Đóng</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {reject && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-[70] overflow-y-auto" onClick={() => setReject(null)}>
          <div className="bg-card border rounded-lg p-5 w-full max-w-md" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-semibold mb-2">Lý do từ chối</h3>
            <textarea className="w-full border rounded-md p-2 bg-background" rows={4} value={reject.reason} onChange={(event) => setReject(prev => prev ? ({ ...prev, reason: event.target.value }) : null)} />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setReject(null)} className="px-3 py-1.5 rounded-md border">Hủy</button>
              <button onClick={doReject} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground">Xác nhận từ chối</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <RoomEditModal
          room={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await load();
            setDetail(null);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

function SortIcon({ columnKey, sortConfig }: { columnKey: string, sortConfig: { key: string, direction: "asc" | "desc" } | null }) {
  if (sortConfig?.key !== columnKey) return null;
  return <span className="ml-1 text-primary text-[10px]">{sortConfig.direction === "asc" ? "(Tăng)" : "(Giảm)"}</span>;
}



