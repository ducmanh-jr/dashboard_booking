import { useEffect, useState } from "react";
import { fetchNotifications, markAsRead, deleteNotification, markReadAll as markReadAllApi } from "../../../../api/notificationsApi";
import { useNavigate } from "react-router-dom";
import { PartnerNotification } from "../../../../shared/types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatType(type: string) {
  return type.replace(/_/g, " ");
}

function notificationTone(type: string) {
  if (type.includes("reject")) return "bg-red-500";
  if (type.includes("approve")) return "bg-emerald-500";
  if (type.includes("request")) return "bg-amber-500";
  return "bg-indigo-500";
}

function notificationBadgeTone(type: string) {
  if (type.includes("reject")) return "border-red-100 bg-red-50 text-red-700";
  if (type.includes("approve")) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (type.includes("request")) return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-indigo-100 bg-indigo-50 text-indigo-700";
}

let cachedNotificationList: PartnerNotification[] | null = null;

export function NotificationsTab() {
  const [list, setList] = useState<PartnerNotification[]>(cachedNotificationList || []);
  const [loading, setLoading] = useState(!cachedNotificationList);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(list.length === 0);
    setError("");
    try {
      const result = await fetchNotifications();
      const nextList = result.notifications || [];
      cachedNotificationList = nextList;
      setList(nextList);
    } catch (err: any) {
      setError(err.message || "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateList(updater: (items: PartnerNotification[]) => PartnerNotification[]) {
    setList((items) => {
      const nextList = updater(items);
      cachedNotificationList = nextList;
      return nextList;
    });
  }

  async function markRead(id: number) {
    try {
      await markAsRead(id);
      updateList((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item));
      window.dispatchEvent(new CustomEvent("notifications-action", { detail: { type: 'read', id } }));
    } catch (err: any) {
      setError(err.message || "Không thể đánh dấu đã đọc.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteNotification(id);
      updateList((items) => items.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent("notifications-action", { detail: { type: 'remove', id } }));
    } catch (err: any) {
      setError(err.message || "Không thể xóa thông báo.");
    }
  }

  async function markReadAll() {
    try {
      await markReadAllApi();
      updateList((items) => items.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new CustomEvent("notifications-action", { detail: { type: 'read-all' } }));
    } catch (err: any) {
      setError(err.message || "Không thể đánh dấu tất cả đã đọc.");
    }
  }

  function handleClick(item: PartnerNotification) {
    if (!item.isRead) markRead(item.id);
    if (item.entityType === "property" || item.type.includes("property")) {
      navigate("/rooms", { state: { targetId: item.entityId, highlight: true } });
    } else if (item.entityType === "booking" || item.type.includes("booking")) {
      navigate("/bookings", { state: { targetId: item.entityId, highlight: true } });
    } else {
      navigate("/");
    }
  }

  if (loading && list.length === 0) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-lg bg-muted" />
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 rounded-lg bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Thông báo</h2>
          <p className="mt-1 text-xs text-muted-foreground">Phản hồi từ quản trị viên và trạng thái duyệt hồ sơ.</p>
        </div>
        {list.some((item) => !item.isRead) && (
          <button
            type="button"
            onClick={markReadAll}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h3 className="text-sm font-bold text-slate-950">Chưa có thông báo</h3>
          <p className="mt-2 text-sm text-slate-500">Khi admin phản hồi, nội dung sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-full border px-4 py-2.5 shadow-sm transition hover:-translate-y-px hover:shadow-md",
                !item.isRead
                  ? "border-indigo-100 bg-gradient-to-r from-white via-white to-indigo-50/70"
                  : "border-slate-200 bg-white/80"
              )}
            >
              <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.isRead ? "bg-slate-300" : notificationTone(item.type))} />

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className={cn("truncate text-sm font-bold", item.isRead ? "text-slate-600" : "text-slate-950")}>{item.title}</h3>
                  {!item.isRead && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">Mới</span>}
                  <span className={cn("hidden rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline-flex", notificationBadgeTone(item.type))}>{formatType(item.type)}</span>
                </div>
                {item.body && <p className={cn("mt-0.5 truncate text-xs", item.isRead ? "text-slate-500" : "font-medium text-slate-700")}>{item.body}</p>}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline", item.isRead ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-indigo-700")}>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(item.id);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                  title="Đóng / Xóa"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
