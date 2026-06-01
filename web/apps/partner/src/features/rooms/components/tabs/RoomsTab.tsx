import { useEffect, useMemo, useState } from "react";
import { fetchRooms, requestDeleteRoom, requestRestoreRoom, fetchAvailability, updateAvailability, bulkUpdateAvailability } from "../../../../api/roomsApi";
import { useLocation, useNavigate } from "react-router-dom";
import { Room } from "../../../../shared/types";
import { RoomDetailModal } from "../modals/RoomDetailModal";
import { useConfirmDialog } from "../../../../shared/components/ConfirmDialog";
import { PARTNER_PORTAL_NAME } from "../../../../shared/config/pageTitles";
import { usePageTitle } from "../../../../shared/hooks/usePageTitle";

type StatusFilter = "all" | "approved" | "pending" | "rejected" | "archived" | "request";

type AvailabilityDay = {
  date: string;
  totalInventory: number;
  booked: number;
  remaining: number;
  pricePerNight: number;
  isClosed: boolean;
  hasOverride: boolean;
  isSoldOut: boolean;
};

type AvailabilityPrice = {
  priceId: number;
  label: string;
  pricePerNight: number;
  totalInventory: number;
  minRemaining: number;
  isAvailable: boolean;
  days: AvailabilityDay[];
};

type AvailabilityResponse = {
  property: { id: number; name: string };
  from: string;
  to: string;
  prices: AvailabilityPrice[];
};

type EditingAvailability = {
  price: AvailabilityPrice;
  day: AvailabilityDay;
};

type BulkEditingAvailability = {
  price: AvailabilityPrice;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
}

function isArchivedRoom(room: Room) {
  return room.isArchived || room.status === "suspended" || room.status === "archived";
}

function statusLabel(status: string) {
  if (status === "suspended" || status === "archived") return "Đã lưu trữ";
  if (status === "active") return "Đã duyệt";
  if (status === "pending_review") return "Chờ duyệt";
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  return "Chờ duyệt";
}

function requestLabel(request: Room["pendingRequest"]) {
  if (!request) return "";
  if (request.action === "delete") return "Chờ duyệt xóa";
  if (request.action === "create") return "Chờ duyệt tạo mới";
  return "Chờ duyệt cập nhật";
}

function statusClass(status: string) {
  if (status === "suspended" || status === "archived") return "border-slate-200 bg-slate-50 text-slate-600";
  if (status === "active" || status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function filterLabel(filter: StatusFilter) {
  if (filter === "archived") return "Đã lưu trữ";
  if (filter === "approved") return "Đã duyệt";
  if (filter === "pending") return "Chờ duyệt";
  if (filter === "rejected") return "Từ chối";
  if (filter === "request") return "Có yêu cầu";
  return "Tất cả";
}

let cachedRooms: Room[] | null = null;


export function RoomsTab() {
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  usePageTitle({ title: "Khách sạn", entity: viewingRoom?.name, portal: PARTNER_PORTAL_NAME, restoreOnUnmount: false });
  const [rooms, setRooms] = useState<Room[]>(cachedRooms || []);
  const [loading, setLoading] = useState(!cachedRooms);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [availabilityRoom, setAvailabilityRoom] = useState<Room | null>(null);
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || "");
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadRooms(forceSkeleton = false) {
    setLoading(forceSkeleton || rooms.length === 0);
    try {
      const result = await fetchRooms();
      const nextRooms = result.hotels || [];
      cachedRooms = nextRooms;
      setRooms(nextRooms);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms(!cachedRooms).catch(() => {});
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state?.message, navigate]);

  async function requestDelete(room: Room) {
    const ok = await confirm({
      title: "Gửi yêu cầu xóa khách sạn",
      message: `Yêu cầu xóa "${room.name}" sẽ được gửi cho Admin duyệt trước khi áp dụng.`,
      confirmText: "Gửi yêu cầu",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await requestDeleteRoom(room.id);
      setMessage(`Đã gửi yêu cầu xóa khách sạn "${room.name}" chờ admin duyệt.`);
      await loadRooms(false);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function requestRestore(room: Room) {
    const ok = await confirm({
      title: "Gửi yêu cầu khôi phục",
      message: `Yêu cầu khôi phục "${room.name}" sẽ được gửi cho Admin duyệt.`,
      confirmText: "Gửi yêu cầu",
    });
    if (!ok) return;
    try {
      await requestRestoreRoom(room.id);
      setMessage(`Đã gửi yêu cầu khôi phục khách sạn "${room.name}" chờ admin duyệt.`);
      await loadRooms(false);
    } catch (error: any) {
      alert(error.message);
    }
  }

  const stats = useMemo(() => {
    const approved = rooms.filter((room) => room.status === "approved" || room.status === "active").length;
    const archived = rooms.filter(isArchivedRoom).length;
    const pending = rooms.filter((room) => !isArchivedRoom(room) && !["approved", "active"].includes(room.status)).length;
    const pendingRequests = rooms.filter((room) => room.pendingRequest).length;
    return { approved, pending, pendingRequests, archived, total: rooms.length };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesSearch = !q || [room.name, room.address, room.city || "", room.roomType].some((value) => value.toLowerCase().includes(q));
      const matchesFilter =
        filter === "all" ||
        (filter === "request" && !!room.pendingRequest) ||
        (filter === "archived" && isArchivedRoom(room)) ||
        (filter !== "request" && filter !== "archived" && (room.status === filter || (filter === "approved" && room.status === "active") || (filter === "pending" && room.status === "pending_review")));
      return matchesSearch && matchesFilter;
    });
  }, [rooms, search, filter]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 rounded-lg bg-muted" />)}
        </div>
        <div className="h-16 rounded-lg bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-32 rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Khách sạn của tôi</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Quản lý hồ sơ, trạng thái duyệt và các yêu cầu đang chờ xử lý.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/create")}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
          </svg>
          Thêm khách sạn
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tổng khách sạn" value={stats.total} tone="slate" />
        <StatCard label="Đang hoạt động" value={stats.approved} tone="emerald" />
        <StatCard label="Cần theo dõi" value={stats.pending} tone="amber" />
        <StatCard label="Yêu cầu chờ" value={stats.pendingRequests} tone="indigo" />
      </div>

      <div className="rounded-xl border border-slate-100 bg-[#fdfbff] p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, địa chỉ, thành phố..."
              className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex gap-0.5 overflow-x-auto rounded-lg border border-slate-200/50 bg-slate-100 p-0.5 shadow-inner">
            {(["all", "approved", "pending", "rejected", "archived", "request"] as StatusFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1 text-[11px] font-semibold transition outline-none",
                  filter === item 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                )}
              >
                {filterLabel(item)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <h3 className="text-base font-bold text-slate-950">Chưa có khách sạn nào</h3>
          <p className="mt-2 text-sm text-slate-500">Tạo hồ sơ khách sạn đầu tiên để gửi duyệt và bắt đầu nhận đặt phòng.</p>
          <button onClick={() => navigate("/create")} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Thêm khách sạn
          </button>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          Không có khách sạn phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRooms.map((room) => {
            const minPrice = room.prices.length ? Math.min(...room.prices.map((item) => item.pricePerNight)) : 0;
            const hasPendingRequest = !!room.pendingRequest;
            const thumbnail = room.images[0]?.url;
            return (
              <article
                key={room.id}
                onClick={() => setViewingRoom(room)}
                className={cn(
                  "group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition cursor-pointer hover:border-primary/40 hover:shadow-md flex flex-col sm:flex-row sm:items-stretch",
                  (room.pendingRequest?.action === "delete" || isArchivedRoom(room)) && "opacity-60 bg-slate-50"
                )}
              >
                {/* Thumbnail */}
                <div className="relative w-full h-44 sm:h-auto sm:w-[152px] overflow-hidden bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-100 shrink-0">
                  {thumbnail ? (
                    <img src={thumbnail} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400">Chưa có ảnh</div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-slate-950 group-hover:text-primary transition-colors">{room.name}</h3>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase", statusClass(room.status))}>
                      {statusLabel(room.status)}
                    </span>
                    {hasPendingRequest && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                        {requestLabel(room.pendingRequest)}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{room.address}</p>

                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
                    <InlineMetric label="Loại" value={room.roomType} />
                    <InlineMetric label="Giá từ" value={minPrice ? `${fmtVnd(minPrice)}/đêm` : "-"} />
                    <InlineMetric label="Sức chứa" value={`${room.capacity} khách`} />
                    <InlineMetric label="Ảnh" value={`${room.images.length}`} />
                  </div>

                  {room.status === "rejected" && room.rejectReason && (
                    <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
                      Lý do từ chối: {room.rejectReason}
                    </div>
                  )}
                  {room.pendingRequest?.note && (
                    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                      Ghi chú admin: {room.pendingRequest.note}
                    </div>
                  )}
                  {isArchivedRoom(room) && (
                    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                      Khách sạn đã ngừng hoạt động. Bạn chỉ có thể xem lịch sử.
                    </div>
                  )}

                  {/* Quick actions — click vào đây không trigger onDetail của article */}
                  <div
                    className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { setAvailabilityRoom(room); }}
                      disabled={isArchivedRoom(room)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Tồn kho
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/edit/${room.id}`)}
                      disabled={hasPendingRequest || isArchivedRoom(room)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Chỉnh sửa
                    </button>
                    {isArchivedRoom(room) ? (
                      <button
                        type="button"
                        onClick={() => requestRestore(room)}
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10.5px] font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Khôi phục
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestDelete(room)}
                        disabled={hasPendingRequest}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Yêu cầu xóa
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {availabilityRoom && (
        <AvailabilityModal room={availabilityRoom} onClose={() => setAvailabilityRoom(null)} />
      )}
      {viewingRoom && (
        <RoomDetailModal
          room={viewingRoom}
          onClose={() => setViewingRoom(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "amber" | "indigo" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    emerald: "bg-emerald-50/70 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50/70 text-amber-600 border-amber-100",
    indigo: "bg-indigo-50/70 text-indigo-600 border-indigo-100",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-100 bg-[#fdfbff] p-3 px-4 shadow-sm hover:border-slate-200 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11.5px] font-semibold text-zinc-500">{label}</div>
        <div className={cn("rounded-md border px-2 py-0.5 text-xs font-extrabold leading-none", toneClass)}>{value}</div>
      </div>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 truncate font-bold text-slate-800">{value}</div>
    </div>
  );
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Safely parse any date string — handles both "2026-05-30" and full ISO timestamps */
function parseDate(dateText: string): Date {
  if (!dateText) return new Date(NaN);
  // If already a valid ISO-with-time string (e.g. from old Prisma serialization)
  if (dateText.includes('T') || dateText.includes('Z')) {
    return new Date(dateText);
  }
  // Plain date "2026-05-30" — parse in local time to avoid timezone shift
  return new Date(`${dateText}T00:00:00`);
}

function fmtShortDate(dateText: string) {
  const d = parseDate(dateText);
  if (isNaN(d.getTime())) return "--/--";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function fmtWeekday(dateText: string) {
  const d = parseDate(dateText);
  if (isNaN(d.getTime())) return "---";
  return d.toLocaleDateString("vi-VN", { weekday: "short" });
}

function AvailabilityModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const [from, setFrom] = useState(() => todayDate());
  const [to, setTo] = useState(() => addDays(todayDate(), 30));
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<EditingAvailability | null>(null);
  const [bulkEditing, setBulkEditing] = useState<BulkEditingAvailability | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const result = await fetchAvailability(room.id, from, to);
      setData(result);
    } catch (error: any) {
      setErr(error.message || "Không tải được tồn kho");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [room.id, from, to]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-6 w-full max-w-5xl overflow-hidden rounded-lg border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Lịch tồn kho</div>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{room.name}</h3>
            <p className="mt-1 text-xs text-slate-500">Số phòng còn bán theo từng ngày.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50" aria-label="Đóng">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b bg-slate-50 px-5 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Từ ngày</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Đến ngày</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary" />
            </label>
            <button type="button" onClick={() => { setFrom(todayDate()); setTo(addDays(todayDate(), 30)); }} className="h-9 rounded-md border bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              30 ngày tới
            </button>
            <button type="button" onClick={() => { setFrom(todayDate()); setTo(addDays(todayDate(), 7)); }} className="h-9 rounded-md border bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              7 ngày tới
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-20 rounded-lg bg-muted" />)}
            </div>
          ) : err ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{err}</div>
          ) : !data?.prices.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Khách sạn chưa có loại phòng để xem tồn kho.</div>
          ) : (
            <div className="space-y-5">
              {data.prices.map((price) => (
                <section key={price.priceId} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-slate-950">{price.label}</h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Tổng {price.totalInventory} phòng • {fmtVnd(price.pricePerNight)}/đêm • thấp nhất còn {price.minRemaining}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkEditing({ price })}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Sửa hàng loạt
                      </button>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", price.isAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
                        {price.isAvailable ? "Còn phòng" : "Có ngày hết phòng"}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto p-4">
                  <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {price.days.map((day) => (
                      <div
                        key={`${price.priceId}-${day.date}`}
                        className={cn(
                          "group min-h-[72px] border-b border-r border-slate-100 p-2 text-center last:border-r-0",
                          day.isClosed
                            ? "bg-slate-100"
                            : day.isSoldOut
                              ? "bg-red-50"
                            : day.booked > 0
                              ? "bg-emerald-50"
                              : "bg-white"
                        )}
                        title={`${day.date}: còn ${day.remaining}/${day.totalInventory}, đã đặt ${day.booked}`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-400">{fmtWeekday(day.date)}</div>
                        <div className="mt-0.5 text-xs font-bold text-slate-600">{fmtShortDate(day.date)}</div>
                        <div className={cn("mt-1 inline-flex min-w-10 items-baseline justify-center rounded-full px-2 py-0.5 text-sm font-black", day.isClosed ? "bg-slate-200 text-slate-600" : day.isSoldOut ? "bg-red-100 text-red-700" : day.booked > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                          {day.isClosed ? "Đóng" : <>{day.remaining}<span className="ml-0.5 text-[10px] font-bold opacity-60">/{day.totalInventory}</span></>}
                        </div>
                        {day.booked > 0 && <div className="mt-1 text-[10px] font-medium text-emerald-700">đã đặt {day.booked}</div>}
                        {day.hasOverride && <div className="mt-1 text-[10px] font-medium text-indigo-500">đã chỉnh</div>}
                        <button
                          type="button"
                          onClick={() => setEditing({ price, day })}
                          className="mt-1 text-[10px] font-bold text-primary opacity-0 transition hover:underline group-hover:opacity-100"
                        >
                          Sửa
                        </button>
                      </div>
                    ))}
                  </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
        {editing && (
          <AvailabilityEditModal
            room={room}
            editing={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
        {bulkEditing && (
          <AvailabilityBulkEditModal
            room={room}
            price={bulkEditing.price}
            defaultFrom={from}
            defaultTo={to}
            onClose={() => setBulkEditing(null)}
            onSaved={() => {
              setBulkEditing(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function AvailabilityEditModal({
  room,
  editing,
  onClose,
  onSaved,
}: {
  room: Room;
  editing: EditingAvailability;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pricePerNight, setPricePerNight] = useState(String(editing.day.pricePerNight || editing.price.pricePerNight || ""));
  const [openInventory, setOpenInventory] = useState(String(editing.day.totalInventory ?? editing.price.totalInventory));
  const [isClosed, setIsClosed] = useState(editing.day.isClosed);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(reset = false) {
    setSaving(true);
    setErr("");
    try {
      await updateAvailability({
          propertyId: room.id,
          priceId: editing.price.priceId,
          date: editing.day.date,
          pricePerNight: Number(pricePerNight),
          openInventory: Number(openInventory),
          isClosed,
          reset,
        });
      onSaved();
    } catch (error: any) {
      setErr(error.message || "Không lưu được thay đổi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Sửa nhanh</div>
            <h3 className="mt-1 text-base font-bold text-slate-950">{editing.price.label} • {fmtShortDate(editing.day.date)}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50" aria-label="Đóng">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Giá bán ngày này</span>
            <input
              type="number"
              min={1}
              value={pricePerNight}
              onChange={(event) => setPricePerNight(event.target.value)}
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Số phòng mở bán</span>
            <input
              type="number"
              min={0}
              value={openInventory}
              onChange={(event) => setOpenInventory(event.target.value)}
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={isClosed} onChange={(event) => setIsClosed(event.target.checked)} />
            Đóng bán ngày này
          </label>
          <div className="text-xs text-slate-500">Hiện đã đặt {editing.day.booked} phòng. Không nên mở bán thấp hơn số đã đặt.</div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4">
          {editing.day.hasOverride && (
            <button type="button" onClick={() => save(true)} disabled={saving} className="mr-auto rounded-md border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
              Về mặc định
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button type="button" onClick={() => save(false)} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityBulkEditModal({
  room,
  price,
  defaultFrom,
  defaultTo,
  onClose,
  onSaved,
}: {
  room: Room;
  price: AvailabilityPrice;
  defaultFrom: string;
  defaultTo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [pricePerNight, setPricePerNight] = useState(String(price.pricePerNight || ""));
  const [openInventory, setOpenInventory] = useState(String(price.totalInventory || ""));
  const [isClosed, setIsClosed] = useState(false);
  const [skipBookedDays, setSkipBookedDays] = useState(true);
  const [applyForever, setApplyForever] = useState(false);
  const [reset, setReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const result = await bulkUpdateAvailability({
          propertyId: room.id,
          priceId: price.priceId,
          from,
          to,
          pricePerNight: Number(pricePerNight),
          openInventory: Number(openInventory),
          isClosed,
          skipBookedDays,
          applyForever,
          reset,
        });
      const skipped = Number(result.skipped?.length || 0);
      if (skipped > 0) {
        alert(`Đã cập nhật ${result.updated} ngày, bỏ qua ${skipped} ngày đã có booking vượt số phòng mới.`);
      }
      onSaved();
    } catch (error: any) {
      setErr(error.message || "Không lưu được thay đổi hàng loạt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500">Sửa hàng loạt</div>
            <h3 className="mt-1 text-base font-bold text-slate-950">{price.label}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50" aria-label="Đóng">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Từ ngày</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Đến ngày</span>
              <input type="date" value={to} disabled={applyForever} onChange={(event) => setTo(event.target.value)} className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400" />
            </label>
          </div>
          <div className={cn("grid gap-3 sm:grid-cols-2", reset && "opacity-40")}>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Giá bán</span>
              <input type="number" min={1} disabled={reset} value={pricePerNight} onChange={(event) => setPricePerNight(event.target.value)} className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Số phòng mở bán</span>
              <input type="number" min={0} disabled={reset} value={openInventory} onChange={(event) => setOpenInventory(event.target.value)} className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50" />
            </label>
          </div>
          <label className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" disabled={reset} checked={isClosed} onChange={(event) => setIsClosed(event.target.checked)} />
            Đóng bán toàn bộ khoảng ngày
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" disabled={reset} checked={applyForever} onChange={(event) => setApplyForever(event.target.checked)} />
            Áp dụng từ ngày bắt đầu trở đi
          </label>
          <label className="flex items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
            <input type="checkbox" checked={reset} onChange={(event) => setReset(event.target.checked)} />
            Đưa khoảng ngày này về mặc định
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" disabled={reset} checked={skipBookedDays} onChange={(event) => setSkipBookedDays(event.target.checked)} />
            Bỏ qua ngày đã có booking vượt số phòng mới
          </label>
          {applyForever && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-700">
              Giá và số phòng sẽ trở thành mặc định mới cho hạng phòng từ ngày bắt đầu trở đi. Nếu bật đóng bán, hệ thống sẽ đóng bán 365 ngày tới.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? "Đang lưu..." : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}
