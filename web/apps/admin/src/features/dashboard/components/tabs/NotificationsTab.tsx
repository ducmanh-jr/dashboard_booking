import { useState, useEffect } from "react";
import { api } from "@nowayhome/api-client";
import { AppNotification } from "../../../../shared/types";

export function NotificationsTab({ onNavigate, onRefreshCount }: { onNavigate: (tab: any, filter: string) => void, onRefreshCount?: () => void }) {
  const [list, setList] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await api("/notifications?limit=50");
      setList(result.notifications || []);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: number) {
    try {
      await api(`/notifications/${id}/read`, { method: "POST" });
      setList(list.map(n => n.id === id ? { ...n, isRead: true } : n));
      onRefreshCount?.();
    } catch { }
  }

  async function remove(id: number) {
    if (!confirm("Xóa thông báo này?")) return;
    try {
      await api(`/notifications/${id}`, { method: "DELETE" });
      setList(list.filter(n => n.id !== id));
      onRefreshCount?.();
    } catch { }
  }

  async function markReadAll() {
    try {
      await api("/notifications/read-all", { method: "POST" });
      setList(list.map(n => ({ ...n, isRead: true })));
      onRefreshCount?.();
    } catch { }
  }

  function handleClick(n: AppNotification) {
    markRead(n.id);
    if (n.type === "new_partner_registration") {
      onNavigate("partners", "pending");
    } else if (n.type === "new_property_creation" || n.type === "property_update_request" || n.type === "property_delete_request") {
      onNavigate("rooms", "pending");
    }
  }

  if (loading && list.length === 0) return <div className="text-center py-20 text-gray-500 animate-pulse">Đang tải thông báo...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tất cả thông báo</div>
        {list.length > 0 && (
          <button
            onClick={markReadAll}
            className="text-xs px-3 py-1.5 border rounded-md hover:bg-accent transition-colors font-medium"
          >
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="py-20 text-center border rounded-2xl bg-muted/20 border-dashed">
          <div className="text-muted-foreground italic text-sm">Không có thong bao nao</div>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm divide-y">
          {list.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`p-5 hover:bg-accent cursor-pointer transition-colors flex gap-4 items-start relative group ${!n.isRead ? "bg-primary/5 border-l-4 border-l-primary" : "opacity-80"}`}
            >
              <div className={`w-1.5 h-1.5 mt-2 rounded-full shrink-0 ${!n.isRead ? "bg-primary animate-pulse" : "bg-transparent"}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-start mb-1">
                  <div className={`font-bold text-sm ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {new Date(n.createdAt).toLocaleString("vi-VN", { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {n.body && <div className="text-xs text-muted-foreground leading-relaxed">{n.body}</div>}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-muted rounded text-muted-foreground">
                    {n.type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all font-bold text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





