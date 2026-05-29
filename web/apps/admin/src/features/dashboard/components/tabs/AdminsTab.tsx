import { useEffect, useReducer } from "react";
import { fetchAdmins, createAdmin, createGoogleAdmin, deleteAdmin, updateAdmin } from "../../../../api/adminsApi";
import { Card, CardHeader, CardTitle, CardContent, Button, cn } from "../../../../shared/components/ui";
import { UserPlus, Edit2, Trash2, ShieldCheck, Mail, User, KeyRound } from "lucide-react";

type Admin = { id: number; email: string; fullName: string; createdAt: string; isSuperAdmin?: boolean; loginMethods?: string[] };

type State = {
  list: Admin[];
  form: { email: string; password: string; fullName: string };
  googleForm: { email: string; fullName: string };
  error: string;
  googleError: string;
  message: string;
  isLoading: boolean;
  isSavingGoogle: boolean;
  editing: (Admin & { password?: string }) | null;
  editError: string;
  isSavingEdit: boolean;
};

type Action =
  | { type: "SET_LIST"; payload: Admin[] }
  | { type: "SET_FORM"; payload: Partial<State["form"]> }
  | { type: "SET_GOOGLE_FORM"; payload: Partial<State["googleForm"]> }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_GOOGLE_ERROR"; payload: string }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SAVING_GOOGLE"; payload: boolean }
  | { type: "START_EDIT"; payload: Admin }
  | { type: "SET_EDIT_FORM"; payload: Partial<Admin & { password?: string }> }
  | { type: "CANCEL_EDIT" }
  | { type: "SET_EDIT_ERROR"; payload: string }
  | { type: "SET_SAVING_EDIT"; payload: boolean };

const initialState: State = {
  list: [],
  form: { email: "", password: "", fullName: "" },
  googleForm: { email: "", fullName: "" },
  error: "",
  googleError: "",
  message: "",
  isLoading: false,
  isSavingGoogle: false,
  editing: null,
  editError: "",
  isSavingEdit: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LIST": return { ...state, list: action.payload };
    case "SET_FORM": return { ...state, form: { ...state.form, ...action.payload } };
    case "SET_GOOGLE_FORM": return { ...state, googleForm: { ...state.googleForm, ...action.payload } };
    case "SET_ERROR": return { ...state, error: action.payload };
    case "SET_GOOGLE_ERROR": return { ...state, googleError: action.payload };
    case "SET_MESSAGE": return { ...state, message: action.payload };
    case "SET_LOADING": return { ...state, isLoading: action.payload };
    case "SET_SAVING_GOOGLE": return { ...state, isSavingGoogle: action.payload };
    case "START_EDIT": return { ...state, editing: { ...action.payload, password: "" }, editError: "" };
    case "SET_EDIT_FORM": return { ...state, editing: state.editing ? { ...state.editing, ...action.payload } : null };
    case "CANCEL_EDIT": return { ...state, editing: null, editError: "" };
    case "SET_EDIT_ERROR": return { ...state, editError: action.payload };
    case "SET_SAVING_EDIT": return { ...state, isSavingEdit: action.payload };
    default: return state;
  }
}

export function AdminsTab({ currentUserId, isSuperAdmin }: { currentUserId: number; isSuperAdmin: boolean }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = async () => {
    try {
      const result = await fetchAdmins();
      dispatch({ type: "SET_LIST", payload: result.admins });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "SET_MESSAGE", payload: "" });
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await createAdmin(state.form);
      dispatch({ type: "SET_MESSAGE", payload: "Đã tạo tài khoản quản trị viên thành công." });
      dispatch({ type: "SET_FORM", payload: { email: "", password: "", fullName: "" } });
      await load();
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_GOOGLE_ERROR", payload: "" });
    dispatch({ type: "SET_MESSAGE", payload: "" });
    dispatch({ type: "SET_SAVING_GOOGLE", payload: true });
    try {
      await createGoogleAdmin(state.googleForm);
      dispatch({ type: "SET_MESSAGE", payload: "Đã thêm email admin được phép đăng nhập bằng Google." });
      dispatch({ type: "SET_GOOGLE_FORM", payload: { email: "", fullName: "" } });
      await load();
    } catch (err: any) {
      dispatch({ type: "SET_GOOGLE_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_SAVING_GOOGLE", payload: false });
    }
  };

  const handleSaveEdit = async () => {
    if (!state.editing) return;
    dispatch({ type: "SET_EDIT_ERROR", payload: "" });
    dispatch({ type: "SET_SAVING_EDIT", payload: true });
    try {
      const body: any = { email: state.editing.email, fullName: state.editing.fullName };
      if (state.editing.password) body.password = state.editing.password;
      await updateAdmin(state.editing.id, body);
      dispatch({ type: "CANCEL_EDIT" });
      await load();
    } catch (err: any) {
      dispatch({ type: "SET_EDIT_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_SAVING_EDIT", payload: false });
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Xóa quản trị viên này?")) return;
    try {
      await deleteAdmin(id);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr] animate-in fade-in duration-500">
      <div className="space-y-4">
      <Card className="h-fit border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UserPlus size={18} />
            </div>
            <CardTitle className="text-base font-bold text-zinc-800">Thêm Quản Trị Viên</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              id="fullName"
              label="Họ và tên"
              icon={User}
              value={state.form.fullName}
              onChange={(v: string) => dispatch({ type: "SET_FORM", payload: { fullName: v } })}
              placeholder="Nguyễn Văn A"
              required
            />
            <FormInput
              id="email"
              label="Email đăng nhập"
              icon={Mail}
              type="email"
              value={state.form.email}
              onChange={(v: string) => dispatch({ type: "SET_FORM", payload: { email: v } })}
              placeholder="admin@example.com"
              required
            />
            <FormInput
              id="password"
              label="Mật khẩu"
              icon={ShieldCheck}
              type="password"
              value={state.form.password}
              onChange={(v: string) => dispatch({ type: "SET_FORM", payload: { password: v } })}
              placeholder="••••••••"
              required
            />
            {state.error && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{state.error}</p>}
            {state.message && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">{state.message}</p>}
            <Button type="submit" className="w-full h-10 font-bold rounded-xl" disabled={state.isLoading}>
              {state.isLoading ? "Đang xử lý..." : "Tạo tài khoản"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card className="h-fit border-indigo-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-indigo-50/60 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                <KeyRound size={18} />
              </div>
              <CardTitle className="text-base font-bold text-zinc-800">Email admin đăng nhập Google</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              <FormInput
                id="googleFullName"
                label="Họ và tên"
                icon={User}
                value={state.googleForm.fullName}
                onChange={(v: string) => dispatch({ type: "SET_GOOGLE_FORM", payload: { fullName: v } })}
                placeholder="Nguyễn Văn A"
                required
              />
              <FormInput
                id="googleEmail"
                label="Email Google admin"
                icon={Mail}
                type="email"
                value={state.googleForm.email}
                onChange={(v: string) => dispatch({ type: "SET_GOOGLE_FORM", payload: { email: v } })}
                placeholder="admin@gmail.com"
                required
              />
              {state.googleError && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{state.googleError}</p>}
              <p className="text-xs leading-5 text-zinc-500">Email được thêm ở đây sẽ là tài khoản admin và có thể đăng nhập bằng nút Google.</p>
              <Button type="submit" className="w-full h-10 font-bold rounded-xl" disabled={state.isSavingGoogle}>
                {state.isSavingGoogle ? "Đang thêm..." : "Thêm email Google"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      </div>

      <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 py-4 px-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold text-zinc-800">
              Danh sách Admin <span className="ml-1.5 text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{state.list.length}</span>
            </CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left border-b border-zinc-100">
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-6 py-3">Họ và tên</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Ngày tham gia</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {state.list.map((admin) => (
                <tr key={admin.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs uppercase">
                        {admin.fullName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-800">
                          {admin.fullName}
                          {admin.id === currentUserId && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase">Bạn</span>}
                          {admin.isSuperAdmin && <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md uppercase">Admin tổng</span>}
                        </span>
                        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          {admin.loginMethods?.includes("password") ? "Mật khẩu + Google" : "Google"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 font-medium">{admin.email}</td>
                  <td className="px-6 py-4 text-zinc-400 font-bold text-xs uppercase">
                    {new Date(admin.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-primary hover:bg-primary/5"
                        onClick={() => dispatch({ type: "START_EDIT", payload: admin })}
                      >
                        <Edit2 size={14} />
                      </Button>
                      {admin.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemove(admin.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {state.editing && (
        <EditModal
          admin={state.editing}
          error={state.editError}
          isSaving={state.isSavingEdit}
          onChange={(v: any) => dispatch({ type: "SET_EDIT_FORM", payload: v })}
          onCancel={() => dispatch({ type: "CANCEL_EDIT" })}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

function FormInput({ id, label, icon: Icon, value, onChange, type = "text", placeholder, required }: any) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <Icon size={16} />
        </div>
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl bg-zinc-50/30 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-zinc-300"
        />
      </div>
    </div>
  );
}

function EditModal({ admin, error, isSaving, onChange, onCancel, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="bg-zinc-50 border-b border-zinc-100 py-5">
          <CardTitle className="text-lg font-bold text-zinc-800">Cập Nhật Thông Tin</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <FormInput
            id="editFullName"
            label="Họ và tên"
            icon={User}
            value={admin.fullName}
            onChange={(v: string) => onChange({ fullName: v })}
          />
          <FormInput
            id="editEmail"
            label="Email"
            icon={Mail}
            type="email"
            value={admin.email}
            onChange={(v: string) => onChange({ email: v })}
          />
          <FormInput
            id="editPassword"
            label="Mật khẩu mới (để trống nếu không đổi)"
            icon={ShieldCheck}
            type="password"
            value={admin.password}
            onChange={(v: string) => onChange({ password: v })}
            placeholder="••••••••"
          />
          {error && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>}
        </CardContent>
        <div className="flex justify-end gap-3 p-6 bg-zinc-50/50 border-t border-zinc-100">
          <Button variant="ghost" onClick={onCancel} className="font-bold rounded-xl px-6">Hủy</Button>
          <Button onClick={onSave} disabled={isSaving} className="font-bold rounded-xl px-8 shadow-md">
            {isSaving ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </div>
      </Card>
    </div>
  );
}





