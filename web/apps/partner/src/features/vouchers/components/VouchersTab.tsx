import { useEffect, useState } from "react";
import { fetchVouchers, createVoucher, deleteVoucher, VoucherItem } from "../../../api/vouchersApi";
import { Plus, Trash2, Calendar, Tag, Percent, DollarSign, Loader2 } from "lucide-react";
import { usePageTitle } from "../../../shared/hooks/usePageTitle";
import { PARTNER_PORTAL_NAME } from "../../../shared/config/pageTitles";

function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
}

function fmtDate(value: string) {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${Number(day)}/${Number(month)}/${year}` : "-";
}

export function VouchersTab() {
  usePageTitle({ title: "Khuyến mãi", portal: PARTNER_PORTAL_NAME, restoreOnUnmount: false });
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchVouchers();
      setVouchers(res);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!code.trim()) {
      setError("Vui lòng nhập mã voucher");
      return;
    }

    if (!discountValue || Number(discountValue) <= 0) {
      setError("Giá trị giảm giá phải lớn hơn 0");
      return;
    }

    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxUses: maxUses ? Number(maxUses) : undefined,
        maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : undefined,
      };

      await createVoucher(payload);
      setSuccessMsg("Tạo voucher thành công!");
      setShowCreateForm(false);
      // Reset form
      setCode("");
      setName("");
      setDiscountValue("");
      setMinOrderAmount("");
      setMaxDiscount("");
      setStartDate("");
      setEndDate("");
      setMaxUses("");
      setMaxUsesPerUser("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi tạo voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (voucherCode: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa voucher ${voucherCode}?`)) {
      return;
    }
    setError("");
    setSuccessMsg("");
    try {
      await deleteVoucher(voucherCode);
      setSuccessMsg(`Đã xoá/hủy kích hoạt voucher ${voucherCode}`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Không thể xóa voucher");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mã Khuyến Mãi (Vouchers)</h1>
          <p className="mt-2 text-sm text-gray-700">
            Quản lý các chương trình ưu đãi và giảm giá dành riêng cho khách sạn của bạn.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {showCreateForm ? "Hủy" : "Tạo Voucher mới"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">{successMsg}</div>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold leading-7 text-gray-900">Tạo mã voucher mới</h3>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="code" className="block text-sm font-medium text-gray-900">
                Mã Voucher (viết liền không dấu, VD: DISK20) *
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: WINTER26"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                Tên chương trình
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Giảm giá mùa đông"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="discountType" className="block text-sm font-medium text-gray-900">
                Loại giảm giá *
              </label>
              <select
                id="discountType"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              >
                <option value="fixed">Số tiền cố định (đ)</option>
                <option value="percent">Phần trăm (%)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="discountValue" className="block text-sm font-medium text-gray-900">
                Giá trị giảm giá *
              </label>
              <input
                type="number"
                id="discountValue"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "VD: 10" : "VD: 100000"}
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="minOrderAmount" className="block text-sm font-medium text-gray-900">
                Đơn tối thiểu (đ)
              </label>
              <input
                type="number"
                id="minOrderAmount"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="VD: 500000"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="maxDiscount" className="block text-sm font-medium text-gray-900">
                Giảm tối đa (đ)
              </label>
              <input
                type="number"
                id="maxDiscount"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="Chỉ dùng cho giảm %"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                disabled={discountType === "fixed"}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-900">
                Ngày bắt đầu *
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-900">
                Ngày kết thúc *
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="maxUses" className="block text-sm font-medium text-gray-900">
                Tổng lượt sử dụng tối đa
              </label>
              <input
                type="number"
                id="maxUses"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Không giới hạn"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="maxUsesPerUser" className="block text-sm font-medium text-gray-900">
                Lượt sử dụng tối đa mỗi khách hàng
              </label>
              <input
                type="number"
                id="maxUsesPerUser"
                value={maxUsesPerUser}
                onChange={(e) => setMaxUsesPerUser(e.target.value)}
                placeholder="Mặc định: 1"
                className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu Voucher
            </button>
          </div>
        </form>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Chưa có voucher nào</h3>
            <p className="mt-1 text-sm text-gray-500 font-normal">Hãy bắt đầu tạo mã khuyến mãi để kích cầu đặt phòng.</p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Mã / Tên Voucher
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Mức giảm giá
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Đơn tối thiểu
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Thời gian áp dụng
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Giới hạn sử dụng
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Trạng thái
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Hành động</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center">
                        <Tag className="mr-2 h-4 w-4 text-indigo-500" />
                        <div>
                          <div className="font-bold text-gray-900">{v.code}</div>
                          <div className="text-gray-500 text-xs font-normal">{v.name || "Không có mô tả"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <div className="flex items-center font-medium">
                        {v.discountType === "percent" ? (
                          <>
                            <Percent className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            {v.discountValue}%
                            {v.maxDiscount && (
                              <span className="ml-1.5 text-xs text-gray-500 font-normal">
                                (Tối đa {fmtVnd(v.maxDiscount)})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <DollarSign className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            {fmtVnd(v.discountValue)}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-normal">
                      {v.minOrderAmount > 0 ? fmtVnd(v.minOrderAmount) : "Không có"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-normal">
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {fmtDate(v.startDate)} - {fmtDate(v.endDate)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-normal">
                      <div className="text-xs">
                        Mỗi User: {v.maxUsesPerUser || 1} lần
                        {v.maxUses && (
                          <div className="text-gray-400">
                            Tổng: tối đa {v.maxUses} lần
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          v.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-red-50 text-red-700 ring-red-600/20"
                        }`}
                      >
                        {v.isActive ? "Đang chạy" : "Vô hiệu"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {v.isActive && (
                        <button
                          onClick={() => handleDelete(v.code)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}