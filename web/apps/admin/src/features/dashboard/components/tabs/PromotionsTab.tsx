import { useEffect, useReducer, useState } from "react";
import {
  fetchPromotions, createPromotion, updatePromotion, togglePromotion, deletePromotion,
  createVoucher, fetchVouchers,
  type Promotion, type PromoFilter, type CreatePromotionPayload, type Voucher,
} from "../../../../api/promotionsApi";
import { Card, CardHeader, CardTitle, CardContent, Button, cn } from "../../../../shared/components/ui";
import { Tag, Plus, ToggleLeft, ToggleRight, Trash2, Ticket, X, ChevronDown } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type State = {
  list: Promotion[];
  isLoading: boolean;
  error: string;
  filter: PromoFilter;
  modal: "create" | "edit" | "voucher" | null;
  selected: Promotion | null;
  isSaving: boolean;
  saveError: string;
};

type Action =
  | { type: "SET_LIST"; payload: Promotion[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_FILTER"; payload: PromoFilter }
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; payload: Promotion }
  | { type: "OPEN_VOUCHER"; payload: Promotion }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_SAVE_ERROR"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LIST": return { ...state, list: action.payload };
    case "SET_LOADING": return { ...state, isLoading: action.payload };
    case "SET_ERROR": return { ...state, error: action.payload };
    case "SET_FILTER": return { ...state, filter: action.payload };
    case "OPEN_CREATE": return { ...state, modal: "create", selected: null, saveError: "" };
    case "OPEN_EDIT": return { ...state, modal: "edit", selected: action.payload, saveError: "" };
    case "OPEN_VOUCHER": return { ...state, modal: "voucher", selected: action.payload };
    case "CLOSE_MODAL": return { ...state, modal: null, selected: null, saveError: "" };
    case "SET_SAVING": return { ...state, isSaving: action.payload };
    case "SET_SAVE_ERROR": return { ...state, saveError: action.payload };
    default: return state;
  }
}

const initialState: State = {
  list: [], isLoading: false, error: "", filter: "all",
  modal: null, selected: null, isSaving: false, saveError: "",
};

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_TABS: { key: PromoFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang chạy" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "expired", label: "Hết hạn" },
  { key: "inactive", label: "Tắt" },
];

const PROMO_TYPE_LABELS: Record<string, string> = {
  early_bird: "Đặt sớm", last_minute: "Phút chót", long_stay: "Ở dài",
  flash_sale: "Flash Sale", loyalty: "Thân thiết", custom: "Tùy chỉnh",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-zinc-100 text-zinc-500 border-zinc-200",
  inactive: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Đang chạy", upcoming: "Sắp tới", expired: "Hết hạn", inactive: "Đã tắt",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function PromotionsTab() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = async (filter: PromoFilter = state.filter) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await fetchPromotions(filter);
      dispatch({ type: "SET_LIST", payload: data });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", payload: e.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  useEffect(() => { load(state.filter); }, [state.filter]);

  const handleToggle = async (p: Promotion) => {
    try {
      await togglePromotion(p.id);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (p: Promotion) => {
    if (!confirm(`Xóa chương trình "${p.name}"?`)) return;
    try {
      await deletePromotion(p.id);
      load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl text-violet-600">
            <Tag size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Khuyến Mãi</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Quản lý chương trình giảm giá & mã voucher</p>
          </div>
        </div>
        <Button
          className="gap-2 font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
          onClick={() => dispatch({ type: "OPEN_CREATE" })}
        >
          <Plus size={16} /> Tạo khuyến mãi
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => dispatch({ type: "SET_FILTER", payload: t.key })}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
              state.filter === t.key
                ? "bg-white text-violet-700 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {/* Table */}
      <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 py-4 px-6">
          <CardTitle className="text-base font-bold text-zinc-800">
            Danh sách{" "}
            <span className="ml-1.5 text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {state.list.length}
            </span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          {state.isLoading ? (
            <div className="py-16 text-center text-zinc-400 text-sm">Đang tải...</div>
          ) : state.list.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-sm">Chưa có chương trình khuyến mãi nào.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold text-left">
                  <th className="px-6 py-3">Tên chương trình</th>
                  <th className="px-6 py-3">Loại</th>
                  <th className="px-6 py-3">Giảm giá</th>
                  <th className="px-6 py-3">Thời hạn</th>
                  <th className="px-6 py-3">Lượt dùng</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {state.list.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-800">{p.name}</div>
                      {p.partnerName && (
                        <div className="text-xs text-zinc-400 mt-0.5">Đối tác: {p.partnerName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                        {PROMO_TYPE_LABELS[p.promoType] ?? p.promoType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-800">
                      {p.discountType === "percent"
                        ? `${p.discountValue}%${p.maxDiscount ? ` (tối đa ${p.maxDiscount.toLocaleString("vi-VN")}đ)` : ""}`
                        : `${p.discountValue.toLocaleString("vi-VN")}đ`}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      <div>{p.startDate}</div>
                      <div className="text-zinc-400">→ {p.endDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-zinc-700">{p.totalUsed}</span>
                      {p.maxUses && <span className="text-zinc-400"> / {p.maxUses}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[11px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide", STATUS_STYLES[p.status])}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
                          title="Mã voucher"
                          onClick={() => dispatch({ type: "OPEN_VOUCHER", payload: p })}
                        >
                          <Ticket size={14} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Chỉnh sửa"
                          onClick={() => dispatch({ type: "OPEN_EDIT", payload: p })}
                        >
                          <ChevronDown size={14} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={cn("h-8 w-8", p.isActive ? "text-emerald-500 hover:bg-emerald-50" : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50")}
                          title={p.isActive ? "Tắt" : "Bật"}
                          onClick={() => handleToggle(p)}
                        >
                          {p.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                          title="Xóa"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modals */}
      {(state.modal === "create" || state.modal === "edit") && (
        <PromotionFormModal
          promotion={state.modal === "edit" ? state.selected : null}
          isSaving={state.isSaving}
          error={state.saveError}
          onClose={() => dispatch({ type: "CLOSE_MODAL" })}
          onSave={async (payload) => {
            dispatch({ type: "SET_SAVING", payload: true });
            dispatch({ type: "SET_SAVE_ERROR", payload: "" });
            try {
              if (state.modal === "edit" && state.selected) {
                await updatePromotion(state.selected.id, payload);
              } else {
                await createPromotion(payload as CreatePromotionPayload);
              }
              dispatch({ type: "CLOSE_MODAL" });
              load();
            } catch (e: any) {
              dispatch({ type: "SET_SAVE_ERROR", payload: e.message });
            } finally {
              dispatch({ type: "SET_SAVING", payload: false });
            }
          }}
        />
      )}

      {state.modal === "voucher" && state.selected && (
        <VoucherModal
          promotion={state.selected}
          onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        />
      )}
    </div>
  );
}

// ─── Promotion Form Modal ─────────────────────────────────────────────────────

function PromotionFormModal({ promotion, isSaving, error, onClose, onSave }: {
  promotion: Promotion | null;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: promotion?.name ?? "",
    promoType: promotion?.promoType ?? "custom",
    discountType: promotion?.discountType ?? "percent",
    discountValue: String(promotion?.discountValue ?? ""),
    maxDiscount: String(promotion?.maxDiscount ?? ""),
    minOrderAmount: String(promotion?.minOrderAmount ?? "0"),
    startDate: promotion?.startDate ?? "",
    endDate: promotion?.endDate ?? "",
    maxUses: String(promotion?.maxUses ?? ""),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      promoType: form.promoType,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
    };
    if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
    if (form.maxUses) payload.maxUses = Number(form.maxUses);
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-2xl border-none rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="bg-gradient-to-r from-violet-600 to-violet-500 py-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-bold text-lg">
              {promotion ? "Cập nhật khuyến mãi" : "Tạo khuyến mãi mới"}
            </CardTitle>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Tên chương trình">
              <input id="promo-name" required value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="VD: Flash Sale Hè 2026"
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại chương trình">
                <select id="promo-type" value={form.promoType} onChange={e => set("promoType", e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none">
                  <option value="custom">Tùy chỉnh</option>
                  <option value="early_bird">Đặt sớm</option>
                  <option value="last_minute">Phút chót</option>
                  <option value="long_stay">Ở dài ngày</option>
                  <option value="flash_sale">Flash Sale</option>
                  <option value="loyalty">Thân thiết</option>
                </select>
              </Field>
              <Field label="Kiểu giảm giá">
                <select id="discount-type" value={form.discountType} onChange={e => set("discountType", e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none">
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (VNĐ)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={form.discountType === "percent" ? "Giảm (%)" : "Giảm (VNĐ)"}>
                <input id="discount-value" type="number" required min={1} value={form.discountValue} onChange={e => set("discountValue", e.target.value)}
                  placeholder={form.discountType === "percent" ? "VD: 20" : "VD: 100000"}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
              </Field>
              {form.discountType === "percent" && (
                <Field label="Giảm tối đa (VNĐ)">
                  <input id="max-discount" type="number" min={0} value={form.maxDiscount} onChange={e => set("maxDiscount", e.target.value)}
                    placeholder="VD: 500000"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
                </Field>
              )}
              <Field label="Đơn tối thiểu (VNĐ)">
                <input id="min-order" type="number" min={0} value={form.minOrderAmount} onChange={e => set("minOrderAmount", e.target.value)}
                  placeholder="0 = không giới hạn"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày bắt đầu">
                <input id="start-date" type="date" required value={form.startDate} onChange={e => set("startDate", e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
              </Field>
              <Field label="Ngày kết thúc">
                <input id="end-date" type="date" required value={form.endDate} onChange={e => set("endDate", e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
              </Field>
            </div>

            <Field label="Tổng lượt dùng tối đa">
              <input id="max-uses" type="number" min={1} value={form.maxUses} onChange={e => set("maxUses", e.target.value)}
                placeholder="Để trống = không giới hạn"
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
            </Field>

            {error && (
              <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold px-5">Hủy</Button>
              <Button type="submit" disabled={isSaving}
                className="rounded-xl font-bold px-8 bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200">
                {isSaving ? "Đang lưu..." : promotion ? "Cập nhật" : "Tạo ngay"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Voucher Modal ────────────────────────────────────────────────────────────

function VoucherModal({ promotion, onClose }: { promotion: Promotion; onClose: () => void }) {
  const [vouchers, setVouchers] = useState<Voucher[]>(promotion.vouchers ?? []);
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await fetchVouchers(promotion.id);
    setVouchers(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await createVoucher(promotion.id, { code: code.toUpperCase(), maxUsesPerUser: Number(maxUses) });
      setCode("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-2xl border-none rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <CardHeader className="bg-gradient-to-r from-violet-600 to-violet-500 py-5 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-bold text-lg">Mã Voucher</CardTitle>
              <p className="text-violet-200 text-xs mt-0.5">{promotion.name}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Create form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              id="voucher-code"
              required value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="VD: SUMMER2026"
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm font-mono bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none uppercase"
            />
            <input
              id="voucher-max-uses"
              type="number" min={1} value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              title="Lượt dùng/user"
              className="w-20 px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:ring-2 focus:ring-violet-300 outline-none text-center"
            />
            <Button type="submit" disabled={isSaving}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold px-4">
              <Plus size={16} />
            </Button>
          </form>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {/* Voucher list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {vouchers.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-8">Chưa có mã voucher nào.</p>
            ) : vouchers.map(v => (
              <div key={v.id} className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="font-mono font-bold text-sm text-violet-700 tracking-wider">{v.code}</span>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{v.totalUsed}/{v.maxUsesPerUser} lượt/user</span>
                  <span className={cn("font-bold px-2 py-0.5 rounded-full border text-[10px] uppercase",
                    v.isActive ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-zinc-500 bg-zinc-100 border-zinc-200")}>
                    {v.isActive ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">{label}</label>
      {children}
    </div>
  );
}
