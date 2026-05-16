import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@nowayhome/api-client";
import { Partner } from "@/shared/types";
import { PartnerEditModal } from "../modals/PartnerEditModal";
import { PartnerHotelRoomsModal } from "../modals/PartnerHotelRoomsModal";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge, cn } from "../../../../shared/components/ui";
import { Search, ChevronUp, ChevronDown, Trash2, Edit, ExternalLink, Check, XCircle } from "lucide-react";

export function PartnersTab({ initialFilter = "pending" }: { initialFilter?: string }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(initialFilter);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);


  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);
  const itemsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["partners", filter],
    queryFn: () => api(`/admin/partners?status=${filter}`),
  });

  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
    }
    if (location.state?.targetId) {
      setTargetId(location.state.targetId);
      const targetPartner = data?.partners?.find((p: any) => p.id === location.state.targetId);
      if (targetPartner) {
        setEditingPartner(targetPartner);
      }
    }
    if (location.state?.highlight) {
      setShouldHighlight(true);
      const timer = setTimeout(() => {
        setShouldHighlight(false);
        setTargetId(null);
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state, data]);

  const list = data?.partners || [];

  const approveMutation = useMutation({
    mutationFn: (id: number) => api(`/admin/partners/${id}/approve`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partners"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/admin/partners/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partners"] }),
  });

  const [reject, setReject] = useState<{ id: number; reason: string } | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const filteredList = useMemo(() => {
    let result = [...list];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.email.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q));
    }
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key as keyof Partner];
        let bVal = b[sortConfig.key as keyof Partner];
        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [list, search, sortConfig]);

  const currentItems = filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  function requestSort(key: string) {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }

  const handleRemove = async (partner: Partner) => {
    if (!confirm(`Xóa đối tác "${partner.fullName}"?`)) return;
    deleteMutation.mutate(partner.id);
  };


  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortConfig?.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  async function doReject() {
    if (!reject) return;
    try {
      await api(`/admin/partners/${reject.id}/reject`, { method: "POST", body: JSON.stringify({ reason: reject.reason }) });
      setReject(null);
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex bg-muted p-1 rounded-lg">
          {[["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                filter === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm">
          Lỗi: {(error as Error).message}
        </Card>
      )}

      <Card className={cn(
        "overflow-hidden shadow-sm border-none transition-all duration-500",
        shouldHighlight && !targetId && "animate-highlight-pulse ring-2 ring-primary/20"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-muted transition-colors" onClick={() => requestSort('email')}>
                  <div className="flex items-center gap-2">Email <SortIcon columnKey="email" /></div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-muted transition-colors" onClick={() => requestSort('fullName')}>
                  <div className="flex items-center gap-2">Họ tên <SortIcon columnKey="fullName" /></div>
                </th>
                <th className="px-4 py-3 text-left font-medium">Khách sạn</th>
                <th className="px-4 py-3 text-left font-medium">Số điện thoại</th>
                <th className="px-4 py-3 text-left font-medium">Ngày đăng ký</th>
                <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4"><div className="h-4 bg-muted rounded w-full" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">Không có dữ liệu đối tác</td>
                </tr>
              ) : (
                currentItems.map((partner) => {
                  const isTarget = shouldHighlight && targetId === partner.id;
                  return (
                    <tr 
                      key={partner.id} 
                      className={cn(
                        "transition-all duration-500",
                        isTarget ? "animate-highlight-pulse bg-primary/10" : "hover:bg-accent/30"
                      )}
                    >
                      <td className="px-4 py-3 font-medium">{partner.email}</td>
                      <td className="px-4 py-3">{partner.fullName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{partner.roomCount || 0} KS</span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedPartner(partner)}>
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{partner.phone || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(partner.createdAt).toLocaleDateString("vi-VN")}</td>
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
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:bg-green-50" 
                                onClick={() => approveMutation.mutate(partner.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                onClick={() => setReject({ id: partner.id, reason: "" })}
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPartner(partner)}>
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={() => handleRemove(partner)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination Placeholder */}
      <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
        <span>Hiển thị {currentItems.length} trên {filteredList.length} đối tác</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <Button variant="outline" size="sm" disabled={page * itemsPerPage >= filteredList.length} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      </div>

      {reject && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle>Từ chối đối tác</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Vui lòng nhập lý do từ chối đăng ký này.</p>
              <textarea 
                className="w-full min-h-[100px] p-3 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Lý do..."
                value={reject.reason}
                onChange={e => setReject({ ...reject, reason: e.target.value })}
              />
            </CardContent>
            <CardFooter className="justify-end gap-3">
              <Button variant="ghost" onClick={() => setReject(null)}>Hủy</Button>
              <Button variant="destructive" onClick={doReject}>Xác nhận từ chối</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {editingPartner && (
        <PartnerEditModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["partners"] })}
        />
      )}
      {selectedPartner && <PartnerHotelRoomsModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />}
    </div>
  );
}







