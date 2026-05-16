import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@nowayhome/api-client";
import { cn } from "../../../../shared/components/ui";
import { Customer } from "../../../../shared/types";

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export function CustomersTab() {
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);

  useEffect(() => {
    if (location.state?.targetId) {
      setTargetId(location.state.targetId);
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
  }, [location.state]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const result = await api(`/admin/customers?${params.toString()}`);
      setCustomers(result.customers || []);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Khách hàng</h2>
          <p className="text-sm text-muted-foreground">Quản lý các tài khoản khách hàng đã được tạo.</p>
        </div>
        <input
          placeholder="Tìm tên, email, số điện thoại..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-4 py-2 border rounded-md text-sm w-full sm:w-80 bg-card"
        />
      </div>

      {err && <div className="text-sm text-destructive">{err}</div>}
      {loading ? (
        <div className="text-muted-foreground">Đang tải...</div>
      ) : (
        <div className={cn(
          "bg-card border rounded-lg overflow-hidden transition-all duration-500",
          shouldHighlight && !targetId && "animate-highlight-pulse ring-2 ring-primary/20"
        )}>
          <table className="w-full text-sm">
            <thead className="bg-muted text-left sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Khách hàng</th>
                <th className="px-4 py-2.5">Liên hệ</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Ngày tạo</th>
                <th className="px-4 py-2.5">Đăng nhập cuối</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có khách hàng</td>
                </tr>
              )}
              {customers.map((customer) => {
                const isTarget = shouldHighlight && targetId === customer.id;
                return (
                  <tr 
                    key={customer.id} 
                    className={cn(
                      "border-t transition-all duration-500",
                      isTarget ? "animate-highlight-pulse bg-primary/10" : "hover:bg-muted/30"
                    )}
                  >
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">ID: {customer.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{customer.email}</div>
                    <div className="text-[10px] text-muted-foreground">{customer.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${customer.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fmtDate(customer.createdAt)}</td>
                  <td className="px-4 py-3">{fmtDate(customer.lastLoginAt)}</td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





