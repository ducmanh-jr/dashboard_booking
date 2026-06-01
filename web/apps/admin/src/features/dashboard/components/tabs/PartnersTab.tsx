import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPartners, approvePartner, deletePartner, rejectPartner } from "../../../../api/partnersApi";
import { Partner } from "@/shared/types";
import { PartnerEditModal } from "../modals/PartnerEditModal";
import { PartnerHotelRoomsModal } from "../modals/PartnerHotelRoomsModal";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge, cn } from "../../../../shared/components/ui";
import { Search, ChevronUp, ChevronDown, Trash2, Edit, ExternalLink, Check, XCircle } from "lucide-react";
import { useConfirmDialog } from "../../../../shared/components/ConfirmDialog";

function removePartnerFromCache(oldData: any, deletedId: number) {
  if (Array.isArray(oldData)) return oldData.filter((partner: Partner) => partner.id !== deletedId);
  if (oldData?.partners) {
    return {
      ...oldData,
      partners: oldData.partners.filter((partner: Partner) => partner.id !== deletedId),
    };
  }
  return oldData;
}

export function PartnersTab({ initialFilter = "pending" }: { initialFilter?: string }) {
  const { state: locState } = useLocation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(initialFilter);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const itemsPerPage = 10;
  const [reject, setReject] = useState<{ id: number; reason: string } | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [mounted, setMounted] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["partners", filter],
    queryFn: () => fetchPartners(filter),
  });

  useEffect(() => {
    if (locState?.filter) {
      setFilter(locState.filter);
    }
    if (locState?.targetId) {
      setTargetId(locState.targetId);
      const targetPartner = data?.partners?.find((partner: any) => partner.id === locState.targetId);
      if (targetPartner) {
        setEditingPartner(targetPartner);
      }
    }
    if (locState?.highlight) {
      setShouldHighlight(true);
      const timer = setTimeout(() => {
        setShouldHighlight(false);
        setTargetId(null);
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [locState, data]);

  const list = Array.isArray(data) ? data : (data as any)?.partners || [];

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePartner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partners"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePartner(id),
    onSuccess: (_result, deletedId) => {
      queryClient.setQueriesData({ queryKey: ["partners"] }, (oldData: any) => removePartnerFromCache(oldData, deletedId));
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });

  const filteredList = useMemo(() => {
    let result = [...list];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((partner) => partner.email.toLowerCase().includes(q) || partner.fullName.toLowerCase().includes(q));
    }
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key as keyof Partner];
        let bVal = b[sortConfig.key as keyof Partner];
        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [list, search, sortConfig]);

  const currentItems = filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const requestSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const doReject = async () => {
    if (!reject) return;
    try {
      await rejectPartner(reject.id, reject.reason);
      setReject(null);
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <PartnerFilter filter={filter} setFilter={setFilter} />
        <form onSubmit={(e) => { e.preventDefault(); e.currentTarget.querySelector("input")?.blur(); }} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </form>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm">
          Lỗi: {(error as Error).message}
        </Card>
      )}

      <Card className={cn(
        "overflow-hidden shadow-sm border-none transition-all duration-500",
        shouldHighlight && !targetId && "animate-highlight-pulse ring-2 ring-primary/20",
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/50 border-b">
                <SortableHeader label="Email" columnKey="email" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Họ tên" columnKey="fullName" sortConfig={sortConfig} onSort={requestSort} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Khách sạn</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Số điện thoại</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ngày đăng ký</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                [1001, 1002, 1003, 1004, 1005].map((id) => (
                  <tr key={id} className="animate-pulse">
                    <td colSpan={7} className="p-4"><div className="h-4 bg-zinc-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">Không có dữ liệu đối tác</td>
                </tr>
              ) : (
                currentItems.map((partner) => (
                  <PartnerRow
                    key={partner.id}
                    partner={partner}
                    isTarget={shouldHighlight && targetId === partner.id}
                    mounted={mounted}
                    onApprove={() => approveMutation.mutate(partner.id)}
                    onReject={() => setReject({ id: partner.id, reason: "" })}
                    onEdit={() => setEditingPartner(partner)}
                    onDelete={async () => {
                      const ok = await confirm({
                        title: "Xóa đối tác",
                        message: `Đối tác "${partner.fullName}" sẽ bị xóa khỏi danh sách quản trị.`,
                        confirmText: "Xóa",
                        tone: "danger",
                      });
                      if (ok) deleteMutation.mutate(partner.id);
                    }}
                    onViewRooms={() => setSelectedPartner(partner)}
                    isProcessing={approveMutation.isPending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
        <span>Hiển thị {currentItems.length} trên {filteredList.length} đối tác</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Button variant="outline" size="sm" disabled={page * itemsPerPage >= filteredList.length} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      </div>

      {reject && <RejectModal reason={reject.reason} setReason={(v: string) => setReject((p) => p ? { ...p, reason: v } : null)} onCancel={() => setReject(null)} onConfirm={doReject} />}

      {editingPartner && (
        <PartnerEditModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["partners"] })}
        />
      )}
      {selectedPartner && <PartnerHotelRoomsModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />}
      {confirmDialog}
    </div>
  );
}

function SortableHeader({ label, columnKey, sortConfig, onSort }: any) {
  return (
    <th
      role="button"
      tabIndex={0}
      className="px-4 py-3 text-left font-semibold text-zinc-700 cursor-pointer hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      onClick={() => onSort(columnKey)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSort(columnKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <SortIcon columnKey={columnKey} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

function PartnerFilter({ filter, setFilter }: any) {
  return (
    <div className="flex bg-muted p-1 rounded-lg">
      {[["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"]].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setFilter(key)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
            filter === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PartnerRow({ partner, isTarget, mounted, onApprove, onReject, onEdit, onDelete, onViewRooms, isProcessing }: any) {
  return (
    <tr className={cn("transition-all duration-500", isTarget ? "animate-highlight-pulse bg-primary/10" : "hover:bg-accent/30")}>
      <td className="px-4 py-3 font-semibold text-zinc-800">{partner.email}</td>
      <td className="px-4 py-3 text-zinc-700 font-medium">{partner.fullName}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">{partner.roomCount || 0} KS</span>
          <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onViewRooms}>
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-medium">{partner.phone || "-"}</td>
      <td className="px-4 py-3 text-muted-foreground font-medium">{mounted ? new Date(partner.createdAt).toLocaleDateString("vi-VN") : "-"}</td>
      <td className="px-4 py-3">
        {partner.status === "pending" ? (
          <Badge variant="secondary">Đang chờ</Badge>
        ) : partner.status === "approved" ? (
          <Badge variant="success">Đã duyệt</Badge>
        ) : (
          <Badge variant="destructive" title={partner.rejectReason || ""}>Từ chối</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          {partner.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:bg-emerald-50" onClick={onApprove} disabled={isProcessing}>
                <Check className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" onClick={onReject}>
                <XCircle className="size-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="size-8 text-zinc-600" onClick={onEdit}>
            <Edit className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function RejectModal({ reason, setReason, onCancel, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Từ chối đối tác</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">Vui lòng nhập lý do từ chối đăng ký này.</p>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            placeholder="Lý do..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} className="font-semibold">Hủy</Button>
          <Button variant="destructive" onClick={onConfirm} className="font-semibold">Xác nhận từ chối</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function SortIcon({ columnKey, sortConfig }: { columnKey: string; sortConfig: { key: string; direction: "asc" | "desc" } | null }) {
  if (sortConfig?.key !== columnKey) return null;
  return sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
}
