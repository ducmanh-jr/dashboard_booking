import { useEffect, useReducer, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { fetchCustomers } from "../../../../api/customersApi";
import { cn } from "../../../../shared/components/ui";
import { Customer } from "../../../../shared/types";

function fmtDate(value: string | null, mounted: boolean) {
  if (!value || !mounted) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

type State = {
  mounted: boolean;
  customers: Customer[];
  loading: boolean;
  err: string;
  search: string;
  targetId: number | null;
  shouldHighlight: boolean;
};

type Action = 
  | { type: "SET_MOUNTED" }
  | { type: "SET_CUSTOMERS"; payload: Customer[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_HIGHLIGHT"; payload: { targetId: number | null; shouldHighlight: boolean } }
  | { type: "CLEAR_HIGHLIGHT" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_MOUNTED": return { ...state, mounted: true };
    case "SET_CUSTOMERS": return { ...state, customers: action.payload, loading: false };
    case "SET_LOADING": return { ...state, loading: action.payload };
    case "SET_ERROR": return { ...state, err: action.payload, loading: false };
    case "SET_SEARCH": return { ...state, search: action.payload };
    case "SET_HIGHLIGHT": return { ...state, targetId: action.payload.targetId, shouldHighlight: action.payload.shouldHighlight };
    case "CLEAR_HIGHLIGHT": return { ...state, targetId: null, shouldHighlight: false };
    default: return state;
  }
}

const initialState: State = {
  mounted: false,
  customers: [],
  loading: false,
  err: "",
  search: "",
  targetId: null,
  shouldHighlight: false,
};

const customerCache: Record<string, Customer[]> = {};

export function CustomersTab() {
  const { state: locState } = useLocation();
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    customers: customerCache[""] || [],
  });

  useEffect(() => {
    dispatch({ type: "SET_MOUNTED" });
  }, []);

  useEffect(() => {
    if (locState?.targetId) {
      dispatch({ type: "SET_HIGHLIGHT", payload: { targetId: locState.targetId, shouldHighlight: state.shouldHighlight } });
    }
    if (locState?.highlight) {
      dispatch({ type: "SET_HIGHLIGHT", payload: { targetId: locState.targetId || state.targetId, shouldHighlight: true } });
      const timer = setTimeout(() => {
        dispatch({ type: "CLEAR_HIGHLIGHT" });
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [locState]);

  const load = useCallback(async () => {
    const searchKey = state.search.trim();
    if (!customerCache[searchKey] || customerCache[searchKey].length === 0) {
      dispatch({ type: "SET_LOADING", payload: true });
    }
    dispatch({ type: "SET_ERROR", payload: "" });
    try {
      const result = await fetchCustomers(searchKey);
      const custs = result.customers || [];
      customerCache[searchKey] = custs;
      dispatch({ type: "SET_CUSTOMERS", payload: custs });
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  }, [state.search]);

  useEffect(() => {
    if (customerCache[state.search.trim()]) {
      dispatch({ type: "SET_CUSTOMERS", payload: customerCache[state.search.trim()] });
    }
    const timer = setTimeout(() => {
      load().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [load, state.search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-800">Khách hàng</h2>
          <p className="text-sm text-zinc-500 font-medium">Quản lý các tài khoản khách hàng đã được tạo.</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); e.currentTarget.querySelector('input')?.blur(); }} className="relative w-full sm:w-80">
          <input
            placeholder="Tìm tên, email, số điện thoại..."
            value={state.search}
            onChange={(event) => dispatch({ type: "SET_SEARCH", payload: event.target.value })}
            className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm bg-card outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </form>
      </div>

      {state.err && <div className="text-sm font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{state.err}</div>}
      
      {state.loading ? (
        <div className="py-12 text-center text-zinc-400 font-medium">Đang tải dữ liệu...</div>
      ) : (
        <div className={cn(
          "bg-card border border-zinc-200 rounded-2xl overflow-hidden transition-all duration-500 shadow-sm",
          state.shouldHighlight && !state.targetId && "animate-highlight-pulse ring-2 ring-primary/20"
        )}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-zinc-500 text-[11px] uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 font-bold text-zinc-500 text-[11px] uppercase tracking-wider">Liên hệ</th>
                  <th className="px-6 py-4 font-bold text-zinc-500 text-[11px] uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-zinc-500 text-[11px] uppercase tracking-wider text-right">Ngày tạo / Đăng nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {state.customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic font-medium">Không tìm thấy khách hàng phù hợp</td>
                  </tr>
                )}
                {state.customers.map((customer) => {
                  const isTarget = state.shouldHighlight && state.targetId === customer.id;
                  return (
                    <tr 
                      key={customer.id} 
                      className={cn(
                        "transition-all duration-500",
                        isTarget ? "animate-highlight-pulse bg-primary/10" : "hover:bg-zinc-50/50"
                      )}
                    >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs uppercase">
                          {customer.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-800">{customer.fullName}</div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">ID: #{customer.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-600">{customer.email}</div>
                      <div className="text-[10px] font-bold text-zinc-400">{customer.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider",
                        customer.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      )}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs font-semibold text-zinc-600">{fmtDate(customer.createdAt, state.mounted)}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">Lần cuối: {fmtDate(customer.lastLoginAt, state.mounted)}</div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
