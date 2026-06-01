import { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Building,
  Receipt
} from "lucide-react";

interface User {
  id: number;
  email: string;
  isSuperAdmin?: boolean;
}

interface Transaction {
  id: string;
  bookingId: string;
  bookingCode: string;
  hotelName: string;
  partnerName: string;
  customerName: string;
  customerEmail: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  amount: number;
  platformFee: number;
  partnerPayout: number;
  type: "CUSTOMER_PAY" | "SYSTEM_PAY_TO_PARTNER" | "COMMISSION_DEDUCTION";
  method: "ONLINE" | "CASH";
  status: "SUCCESS" | "PENDING";
  createdAt: string;
}

interface Partner {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  registered: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  virtualCustomerAccountNumber: string;
  walletBalance: number;
  depositsAndWithdrawals: any[];
  propertyNames: string[];
}

interface SystemTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  targetBank: string;
  targetAccount: string;
  targetHolder: string;
  status: string;
  createdAt: string;
  description?: string;
  isOpeningBalance?: boolean;
}

interface TaxRecord {
  month: string;
  commission: number;
  taxDue: number;
  status: "PAID" | "UNPAID";
  paidAt: string | null;
}

interface DashboardData {
  transactions: Transaction[];
  partners: Partner[];
  system: {
    bankAccountNumber: string;
    bankName: string;
    initialBalance: number;
    platformFeeRevenue: number;
    balance: number;
    depositsAndWithdrawals: SystemTransaction[];
    paidTaxes: any[];
    monthlyTaxes: TaxRecord[];
  };
}

export function TransactionsTab({ user }: { user?: User | null }) {
  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // UI tabs inside dashboard
  const [activeSubTab, setActiveSubTab] = useState<"general" | "partners" | "system">("general");

  // Selected entities for Modals
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  
  // Modals state
  const [showSystemTxModal, setShowSystemTxModal] = useState(false);
  const [systemTxType, setSystemTxType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [systemTxAmount, setSystemTxAmount] = useState("");
  const [systemTxBank, setSystemTxBank] = useState("Vietcombank");
  const [systemTxAccount, setSystemTxAccount] = useState("");
  const [systemTxHolder, setSystemTxHolder] = useState("");
  const [isProcessingSystemTx, setIsProcessingSystemTx] = useState(false);


  // Tax paying state
  const [payingTaxMonth, setPayingTaxMonth] = useState<string | null>(null);
  const [taxToPay, setTaxToPay] = useState<TaxRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/transactions/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedPartners = useMemo(() => {
    return [...(data?.partners || [])].sort((a, b) => {
      if (b.walletBalance !== a.walletBalance) return b.walletBalance - a.walletBalance;
      return a.businessName.localeCompare(b.businessName);
    });
  }, [data?.partners]);

  const selectedPartner = sortedPartners.find((partner) => partner.id === selectedPartnerId) || sortedPartners[0] || null;

  const handleSystemTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemTxAmount || isNaN(Number(systemTxAmount)) || Number(systemTxAmount) <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    setIsProcessingSystemTx(true);
    try {
      const res = await fetch("/api/admin/system/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: systemTxType,
          amount: Number(systemTxAmount),
          targetBank: systemTxBank,
          targetAccount: systemTxAccount,
          targetHolder: systemTxHolder,
        }),
      });

      if (res.ok) {
        setShowSystemTxModal(false);
        setSystemTxAmount("");
        setSystemTxAccount("");
        setSystemTxHolder("");
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Giao dịch không thành công");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối máy chủ");
    } finally {
      setIsProcessingSystemTx(false);
    }
  };

  const confirmPayTax = async () => {
    if (!taxToPay) return;
    setPayingTaxMonth(taxToPay.month);
    try {
      const res = await fetch("/api/admin/system/pay-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: taxToPay.month,
          amount: taxToPay.taxDue,
        }),
      });

      if (res.ok) {
        await loadData();
        setTaxToPay(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Nộp thuế thất bại");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối máy chủ");
    } finally {
      setPayingTaxMonth(null);
    }
  };

  const handlePayTax = (tax: TaxRecord) => {
    setTaxToPay(tax);
  };

  if (loading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4f46e5] border-t-transparent"></div>
          <p className="text-sm font-medium">Đang tải trung tâm giao dịch...</p>
        </div>
      </div>
    );
  }

  // Filter transactions
  const filteredTransactions = (data.transactions || []).filter((tx) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      tx.id.toLowerCase().includes(query) ||
      tx.bookingCode.toLowerCase().includes(query) ||
      tx.hotelName.toLowerCase().includes(query) ||
      tx.partnerName.toLowerCase().includes(query);

    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesMethod = methodFilter === "all" || tx.method === methodFilter;

    let matchesTime = true;
    if (timeFilter !== "all") {
      const txDate = new Date(tx.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (timeFilter === "7days") {
        matchesTime = diffDays <= 7;
      } else if (timeFilter === "30days") {
        matchesTime = diffDays <= 30;
      }
    }

    return matchesSearch && matchesType && matchesMethod && matchesTime;
  });

  // Gross and stats
  const totalCustomerPaidOnline = data.transactions
    .filter(t => t.type === "CUSTOMER_PAY")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSystemPayout = data.transactions
    .filter(t => t.type === "SYSTEM_PAY_TO_PARTNER")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCommissionDeducted = data.transactions
    .filter(t => t.type === "COMMISSION_DEDUCTION")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Tổng quan Giao dịch & Dòng tiền</h1>
          <p className="text-xs text-slate-500">Giám sát tài chính toàn hệ thống, thuế hàng tháng, tài khoản Vietcombank công ty và số dư ví Host.</p>
        </div>

        {/* Sub-Tab Selector */}
        <div className="flex rounded-lg border bg-slate-50 p-1 dark:bg-slate-900">
          <button
            onClick={() => setActiveSubTab("general")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeSubTab === "general" ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800"}`}
          >
            Lịch sử giao dịch
          </button>
          <button
            onClick={() => setActiveSubTab("partners")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeSubTab === "partners" ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800"}`}
          >
            Số dư Đối tác
          </button>
          <button
            onClick={() => setActiveSubTab("system")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeSubTab === "system" ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800"}`}
          >
            Tài khoản Hệ thống & Thuế
          </button>
        </div>
      </div>

      {activeSubTab === "general" && (
        <>
          {/* Main Dashboard Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Thanh toán Online (Gross)</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <div className="mt-3 text-lg font-black">{totalCustomerPaidOnline.toLocaleString("vi-VN")} đ</div>
              <p className="mt-1 text-[10px] text-slate-400">Khách hàng đặt cọc/thanh toán trực tuyến</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm bg-white dark:bg-slate-900">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chuyển tiền Đối tác</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <ArrowDownLeft size={14} />
                </span>
              </div>
              <div className="mt-3 text-lg font-black">{totalSystemPayout.toLocaleString("vi-VN")} đ</div>
              <p className="mt-1 text-[10px] text-slate-400">Doanh thu đối tác sau đối soát (90%)</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm bg-white dark:bg-slate-900">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hoa hồng tại chỗ (Cash)</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                  <DollarSign size={14} />
                </span>
              </div>
              <div className="mt-3 text-lg font-black">{totalCommissionDeducted.toLocaleString("vi-VN")} đ</div>
              <p className="mt-1 text-[10px] text-slate-400">Phí thu 10% hoa hồng trực tiếp vào ví</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm bg-linear-to-br from-indigo-50 to-white border-indigo-100 dark:from-slate-950 dark:to-slate-900 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Doanh thu Hệ thống</span>
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <TrendingUp size={14} />
                </span>
              </div>
              <div className="mt-3 text-lg font-black text-indigo-600 dark:text-indigo-400">
                {data.system.platformFeeRevenue.toLocaleString("vi-VN")} đ
              </div>
              <p className="mt-1 text-[10px] text-indigo-500/80 dark:text-indigo-300/80">Tổng 10% hoa hồng tích lũy</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="rounded-xl border bg-card shadow-sm bg-white dark:bg-slate-900">
            <div className="p-5 border-b flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã giao dịch, đặt phòng, đối tác, khách sạn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border bg-background px-2 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Tất cả loại giao dịch</option>
                  <option value="CUSTOMER_PAY">Khách thanh toán ONLINE</option>
                  <option value="SYSTEM_PAY_TO_PARTNER">Hệ thống chuyển tiền cho đối tác</option>
                  <option value="COMMISSION_DEDUCTION">Đối tác trả phí hoa hồng (CASH)</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="rounded-lg border bg-background px-2 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Tất cả phương thức</option>
                  <option value="ONLINE">Online</option>
                  <option value="CASH">Tại khách sạn</option>
                </select>

                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="rounded-lg border bg-background px-2 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Mọi thời gian</option>
                  <option value="7days">7 ngày qua</option>
                  <option value="30days">30 ngày qua</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <AlertCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-semibold">Không tìm thấy giao dịch nào phù hợp</p>
              </div>
            ) : (() => {
              // Group transactions by bookingCode
              const grouped = filteredTransactions.reduce<Record<string, typeof filteredTransactions>>((acc, tx) => {
                if (!acc[tx.bookingCode]) acc[tx.bookingCode] = [];
                acc[tx.bookingCode].push(tx);
                return acc;
              }, {});

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Đặt phòng</th>
                        <th className="py-3 px-4">Đối tác / Khách sạn</th>
                        <th className="py-3 px-4">Phương thức</th>
                        <th className="py-3 px-4 text-center border-l border-blue-100 bg-blue-50/40 dark:bg-blue-950/20">
                          <span className="text-blue-600 dark:text-blue-400">Khách hàng</span>
                        </th>
                        <th className="py-3 px-4 text-center border-l border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20">
                          <span className="text-emerald-600 dark:text-emerald-400">Đối tác</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-semibold text-slate-800 dark:text-slate-200">
                      {Object.entries(grouped).map(([bookingCode, txList]) => {
                        const customerTx = txList.find(t => t.type === 'CUSTOMER_PAY');
                        const partnerTx  = txList.find(t => t.type === 'SYSTEM_PAY_TO_PARTNER');
                        const cashTx     = txList.find(t => t.type === 'COMMISSION_DEDUCTION');
                        const baseTx = customerTx || cashTx || txList[0];
                        const isOnline = baseTx.method === 'ONLINE';

                        // Customer column
                        let customerCell: React.ReactNode;
                        if (isOnline && customerTx) {
                          customerCell = (
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              + {customerTx.amount.toLocaleString('vi-VN')} đ
                            </span>
                          );
                        } else {
                          customerCell = (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              Thanh toán tại khách sạn
                            </span>
                          );
                        }

                        // Partner column
                        let partnerCell: React.ReactNode;
                        if (isOnline) {
                          const isPending = !partnerTx || baseTx.status === 'PENDING';
                          const payout = partnerTx ? partnerTx.amount : (customerTx ? customerTx.partnerPayout : 0);
                          partnerCell = (
                            <span className={
                              isPending
                                ? 'font-black text-amber-500 dark:text-amber-400'
                                : 'font-black text-red-600 dark:text-red-400'
                            }>
                              - {payout.toLocaleString('vi-VN')} đ
                              {isPending && (
                                <span className="ml-1 text-[9px] font-bold text-amber-400 align-middle">(chờ)</span>
                              )}
                            </span>
                          );
                        } else {
                          const payout = cashTx ? cashTx.amount : 0;
                          partnerCell = (
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              + {payout.toLocaleString('vi-VN')} đ
                            </span>
                          );
                        }

                        // Determine which tx to open per side
                        const onClickCustomer = isOnline && customerTx
                          ? () => setSelectedTransaction(customerTx)
                          : undefined;
                        const onClickPartner = isOnline
                          ? (partnerTx ? () => setSelectedTransaction(partnerTx) : undefined)
                          : (cashTx ? () => setSelectedTransaction(cashTx) : undefined);

                        return (
                          <tr
                            key={bookingCode}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{baseTx.bookingCode}</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">{baseTx.customerName}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold truncate max-w-[150px] block">{baseTx.partnerName}</span>
                              <span className="block text-[9px] text-slate-400 truncate max-w-[150px]">{baseTx.hotelName}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={
                                isOnline
                                  ? 'inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : 'inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                              }>
                                {isOnline ? 'Online' : 'Tại chỗ'}
                              </span>
                            </td>
                            {/* Customer invoice cell */}
                            <td
                              className={`py-3.5 px-4 text-center border-l border-blue-50 bg-blue-50/20 dark:bg-blue-950/10 ${onClickCustomer ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors' : ''}`}
                              onClick={onClickCustomer}
                              title={onClickCustomer ? 'Xem hóa đơn khách hàng' : undefined}
                            >
                              {customerCell}
                              {onClickCustomer && (
                                <span className="block text-[8px] text-blue-400 mt-0.5">↗ xem hóa đơn</span>
                              )}
                            </td>
                            {/* Partner invoice cell */}
                            <td
                              className={`py-3.5 px-4 text-center border-l border-emerald-50 bg-emerald-50/20 dark:bg-emerald-950/10 ${onClickPartner ? 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors' : ''}`}
                              onClick={onClickPartner}
                              title={onClickPartner ? 'Xem hóa đơn đối tác' : undefined}
                            >
                              {partnerCell}
                              {onClickPartner && (
                                <span className="block text-[8px] text-emerald-400 mt-0.5">↗ xem hóa đơn</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {activeSubTab === "partners" && (
        <div className="space-y-6">
          <div className="rounded-xl border p-5 bg-slate-50 dark:bg-slate-900 border-slate-200">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building size={16} className="text-indigo-600" />
              Tổng quan ví các Đối tác liên kết (Host Wallet Balance)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Xem số dư ví thanh toán của đối tác và lịch sử các giao dịch nạp/rút đối soát chi tiết của từng host.</p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="rounded-xl border bg-white shadow-xs dark:bg-slate-900">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Danh sách đối tác</h3>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">Ưu tiên nhiều tiền</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Sắp xếp theo số dư ví giảm dần. Bấm vào từng dòng để xem chi tiết.</p>
              </div>
              <div className="max-h-[680px] overflow-y-auto p-2">
                {sortedPartners.map((partner, index) => {
                  const active = selectedPartner?.id === partner.id;
                  const isNegative = partner.walletBalance < 0;
                  return (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => setSelectedPartnerId(partner.id)}
                      className={`mb-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${active ? "border-indigo-200 bg-indigo-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-950">{partner.businessName}</div>
                        <div className="truncate text-[11px] text-slate-500">{partner.email}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${isNegative ? "text-red-600" : "text-emerald-600"}`}>{partner.walletBalance.toLocaleString("vi-VN")} đ</div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">{partner.depositsAndWithdrawals.length} nạp/rút</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {selectedPartner ? (
                <>
                  <div className="rounded-xl border bg-white p-5 shadow-xs dark:bg-slate-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-xl font-black text-slate-950 dark:text-white">{selectedPartner.businessName}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${selectedPartner.registered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {selectedPartner.registered ? "Đã liên kết" : "Chưa kích hoạt"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{selectedPartner.email}</p>
                      </div>
                      <div className="grid min-w-[260px] gap-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Số dư ví hiện tại</div>
                          <div className={`mt-1 text-2xl font-black ${selectedPartner.walletBalance < 0 ? "text-red-600" : "text-emerald-600"}`}>{selectedPartner.walletBalance.toLocaleString("vi-VN")} đ</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border bg-white p-4 shadow-xs dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h4 className="text-sm font-black text-slate-950 dark:text-white">Danh sách khách sạn</h4>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">{selectedPartner.propertyNames.length} khách sạn</span>
                      </div>
                      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {selectedPartner.propertyNames.length === 0 ? (
                          <div className="rounded-lg bg-slate-50 p-4 text-center text-xs font-medium text-slate-400">Chưa có khách sạn liên kết</div>
                        ) : selectedPartner.propertyNames.map((name, index) => (
                          <div key={`${selectedPartner.id}-${name}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-indigo-700 shadow-xs">{index + 1}</div>
                            <div className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{name}</div>
                          </div>
                        ))}
                      </div>
                    </div>


                    <div className="rounded-xl border bg-white p-4 shadow-xs dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h4 className="text-sm font-black text-slate-950 dark:text-white">Giao dịch nạp/rút ví</h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{selectedPartner.depositsAndWithdrawals.length} giao dịch</span>
                      </div>
                      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {selectedPartner.depositsAndWithdrawals.length === 0 ? (
                          <div className="rounded-lg bg-slate-50 p-4 text-center text-xs font-medium text-slate-400">Chưa phát sinh giao dịch nạp/rút ví</div>
                        ) : selectedPartner.depositsAndWithdrawals.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                            <div>
                              <div className={`text-xs font-black ${tx.type === "DEPOSIT" ? "text-emerald-600" : "text-amber-600"}`}>{tx.type === "DEPOSIT" ? "Nạp ví" : "Rút ví"}</div>
                              <div className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleString("vi-VN")}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900">{Number(tx.amount || 0).toLocaleString("vi-VN")} đ</div>
                              <div className="text-[10px] font-bold uppercase text-slate-400">{tx.status || "SUCCESS"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500 shadow-xs">Chưa có đối tác để hiển thị.</div>
              )}
            </div>
          </div>

          <div className="hidden">
            {data.partners.map((partner) => {
              const isNegative = partner.walletBalance < 0;
              return (
                <div key={partner.id} className="rounded-xl border p-5 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white leading-tight">{partner.businessName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{partner.email}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${partner.registered ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : "bg-slate-100 text-slate-400"}`}>
                        {partner.registered ? "Đã liên kết" : "Chưa kích hoạt"}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-slate-50 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Số dư ví hiện tại:</span>
                        <span className={`font-black text-sm ${isNegative ? "text-red-600" : "text-emerald-600"}`}>
                          {partner.walletBalance.toLocaleString("vi-VN")} đ
                        </span>
                      </div>

                      {partner.registered && (
                        <>
                          <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded leading-relaxed">
                            <span className="block font-bold">Ngân hàng: {partner.bankName}</span>
                            <span className="block">Số TK: {partner.bankAccountNumber}</span>
                            <span className="block">Chủ TK: {partner.bankAccountHolder}</span>
                            <span className="block font-bold text-indigo-600 mt-1">TK ảo của khách: {partner.virtualCustomerAccountNumber}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lịch sử giao dịch ví nạp/rút của Host */}
                  <div className="mt-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Giao dịch nạp/rút ví ({partner.depositsAndWithdrawals.length})</span>
                    {partner.depositsAndWithdrawals.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">Chưa phát sinh giao dịch nạp/rút ví</span>
                    ) : (
                      <div className="max-h-[100px] overflow-y-auto space-y-1 pr-1">
                        {partner.depositsAndWithdrawals.map((tx: any) => (
                          <div key={tx.id} className="flex justify-between items-center text-[10px]">
                            <span className={`font-bold ${tx.type === "DEPOSIT" ? "text-emerald-600" : "text-amber-600"}`}>
                              {tx.type === "DEPOSIT" ? "NẠP VÍ" : "RÚT VÍ"}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{tx.amount.toLocaleString("vi-VN")} đ</span>
                            <span className="text-slate-400">{new Date(tx.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === "system" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Vietcombank Card & Deposit History */}
          <div className="lg:col-span-7 space-y-6">
            {/* Premium System Credit Card */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-7 text-white shadow-2xl border border-white/10 group">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700"></div>
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl group-hover:bg-blue-500/30 transition-all duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-8 rounded bg-gradient-to-br from-yellow-300 to-yellow-600 opacity-90 shadow-sm flex items-center justify-center">
                        <div className="h-4 w-6 border border-yellow-200/40 rounded-sm"></div>
                      </div>
                      <span className="text-xs font-black tracking-[0.2em] text-white/90">NOWAYHOME PLATFORM</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
                    {isSuperAdmin ? (
                      <>
                        <Unlock size={10} className="text-emerald-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Admin Tổng</span>
                      </>
                    ) : (
                      <>
                        <Lock size={10} className="text-rose-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">Chỉ Xem</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-8 mb-6">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.15em] text-indigo-200/70 mb-1">Số dư hệ thống</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-white drop-shadow-md">
                      {data.system.balance.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-xl font-bold text-indigo-300">VNĐ</span>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex gap-8">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-indigo-300/60 mb-0.5">Tài khoản</span>
                      <span className="font-mono text-sm tracking-widest text-white/90 drop-shadow-sm">{data.system.bankAccountNumber}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-indigo-300/60 mb-0.5">Ngân hàng</span>
                      <span className="font-bold text-sm text-white/90 drop-shadow-sm">{data.system.bankName}</span>
                    </div>
                  </div>
                  
                  {/* Master card like circles */}
                  <div className="flex items-center -space-x-3">
                    <div className="h-8 w-8 rounded-full bg-rose-500/80 mix-blend-screen"></div>
                    <div className="h-8 w-8 rounded-full bg-amber-500/80 mix-blend-screen"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action for Super Admin - Moved outside the card to keep the card clean */}
            <div className="mt-4 flex gap-3">
              {isSuperAdmin ? (
                <>
                  <button
                    onClick={() => {
                      setSystemTxType("DEPOSIT");
                      setShowSystemTxModal(true);
                    }}
                    className="flex-1 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 hover:shadow-md text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={16} className="text-indigo-600" /> Nạp tiền
                  </button>
                  <button
                    onClick={() => {
                      setSystemTxType("WITHDRAW");
                      setShowSystemTxModal(true);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight size={16} /> Rút tiền
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-3 text-[11px] text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-800">
                  <Lock size={12} /> Yêu cầu quyền Admin Tổng để giao dịch
                </div>
              )}
            </div>

            {/* System Deposit/Withdrawal history */}
            <div className="rounded-xl border p-5 bg-white dark:bg-slate-900 shadow-xs">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">Lịch sử giao dịch hệ thống</h3>
              {data.system.depositsAndWithdrawals.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Chưa phát sinh giao dịch nạp/rút từ tài khoản ngân hàng hệ thống</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[250px] overflow-y-auto space-y-2 pr-1">
                  {data.system.depositsAndWithdrawals.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-md ${tx.type === "DEPOSIT" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                          {tx.type === "DEPOSIT" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {tx.description || (tx.type === "DEPOSIT" ? "Nạp tiền" : "Chuyển khoản")}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            {tx.targetBank} • {tx.targetAccount}
                            {tx.isOpeningBalance ? " • Admin tổng" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-black ${tx.type === "DEPOSIT" ? "text-emerald-600" : "text-red-600"}`}>
                          {tx.type === "DEPOSIT" ? "+" : "-"} {tx.amount.toLocaleString("vi-VN")} đ
                        </span>
                        <span className="block text-[9px] text-slate-400">{new Date(tx.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tax Payment Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border p-5 bg-white dark:bg-slate-900 shadow-xs relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Báo cáo thuế & nộp ngân sách</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thuế 10% tính trên tổng hoa hồng hệ thống nhận được hàng tháng</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Receipt size={16} />
                </div>
              </div>

              {/* Collapsible/Scrollable months */}
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
                {data.system.monthlyTaxes.map((tax) => {
                  const isPaid = tax.status === "PAID";
                  const isPaying = payingTaxMonth === tax.month;
                  
                  return (
                    <div key={tax.month} className="rounded-lg border p-3.5 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <span className="inline-block rounded bg-indigo-100 text-indigo-800 dark:bg-slate-800 dark:text-indigo-300 font-bold px-2 py-0.5 text-[10px]">
                          Tháng {tax.month.slice(5)}/{tax.month.slice(0, 4)}
                        </span>
                        <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-500">
                          <div>Hoa hồng nhận: <span className="font-bold">{tax.commission.toLocaleString("vi-VN")} đ</span></div>
                          <div>Thuế phải đóng: <span className="font-bold text-amber-600">{tax.taxDue.toLocaleString("vi-VN")} đ</span></div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={10} /> Đã nộp thuế
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <AlertCircle size={10} /> Chưa nộp
                            </span>
                            {isSuperAdmin ? (
                              <button
                                onClick={() => handlePayTax(tax)}
                                disabled={isPaying || tax.taxDue === 0}
                                className={`text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition disabled:opacity-50`}
                              >
                                {isPaying ? "Đang xử lý..." : "Nộp thuế"}
                              </button>
                            ) : (
                              <span className="text-[8px] text-slate-400 italic">Chỉ xem</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedTransaction(null)}>
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedTransaction(null)} className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 transition">
              <X size={14} />
            </button>

            <div className="p-6 text-black">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-black pb-3 mb-4">
                <div>
                  <h2 className="text-sm font-black tracking-tight">NOWAYHOME</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">CÔNG TY CỔ PHẦN CÔNG NGHỆ NHÀ ĐẸP</p>
                </div>
                <div className="text-right">
                  <h1 className="text-sm font-black">HÓA ĐƠN</h1>
                  <p className="text-[10px] text-gray-500">Số: HD-2026-{selectedTransaction.id.slice(-6).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-500">{new Date(selectedTransaction.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>

              {/* Body rows */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Khách hàng</span>
                  <span className="font-semibold">{selectedTransaction.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span>{selectedTransaction.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Khách sạn</span>
                  <span className="font-semibold">{selectedTransaction.hotelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-in</span>
                  <span>{new Date(selectedTransaction.checkInDate).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-out</span>
                  <span>{new Date(selectedTransaction.checkOutDate).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số đêm</span>
                  <span>{selectedTransaction.nights} đêm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phương thức</span>
                  <span>{selectedTransaction.method === "ONLINE" ? "Online" : "Tiền mặt"}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 border-t border-black pt-3 flex justify-between items-center">
                <span className="font-black text-sm">TỔNG CỘNG</span>
                <span className="font-black text-base">{selectedTransaction.amount.toLocaleString("vi-VN")} đ</span>
              </div>

              <p className="mt-3 text-center text-[9px] text-gray-400">
                Ký hiệu: 1C26NWH • Nowayhome Platform
              </p>

              <button
                onClick={() => setSelectedTransaction(null)}
                className="mt-4 w-full border border-black text-black text-xs font-bold py-2 rounded-lg hover:bg-black hover:text-white transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System TX Modal (Deposit/Withdraw) */}
      {showSystemTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100">
            <button
              onClick={() => setShowSystemTxModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {systemTxType === "DEPOSIT" ? "Nạp tiền vào tài khoản Vietcombank" : "Rút tiền từ tài khoản Vietcombank"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">Hệ thống sẽ thực hiện xác thực và đối soát giao dịch tự động.</p>

            <form onSubmit={handleSystemTxSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Số tiền (VND)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1000000"
                  value={systemTxAmount}
                  onChange={(e) => setSystemTxAmount(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngân hàng giao dịch</label>
                <select
                  value={systemTxBank}
                  onChange={(e) => setSystemTxBank(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
                >
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="MBBank">MBBank</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Số tài khoản nhận</label>
                <input
                  type="text"
                  placeholder="Nhập số tài khoản nhận"
                  value={systemTxAccount}
                  onChange={(e) => setSystemTxAccount(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tên chủ tài khoản nhận</label>
                <input
                  type="text"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={systemTxHolder}
                  onChange={(e) => setSystemTxHolder(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingSystemTx}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isProcessingSystemTx ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Đang duyệt & xác thực tự động...</span>
                  </>
                ) : (
                  <span>Xác thực giao dịch</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Tax Payment Confirmation Modal */}
      {taxToPay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setTaxToPay(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                Xác nhận thanh toán thuế
              </h3>
              <button onClick={() => setTaxToPay(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Kỳ thuế tháng {taxToPay.month}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {taxToPay.taxDue.toLocaleString("vi-VN")} đ
                </p>
              </div>
              <p className="text-xs text-slate-500 max-w-[250px] mx-auto leading-relaxed">
                Số tiền này sẽ được trừ trực tiếp từ số dư ví hệ thống NOWAYHOME SYSTEMS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setTaxToPay(null)}
                disabled={payingTaxMonth === taxToPay.month}
                className="w-full rounded-xl py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmPayTax}
                disabled={payingTaxMonth === taxToPay.month}
                className="w-full rounded-xl py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
              >
                {payingTaxMonth === taxToPay.month ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Đang xử lý
                  </>
                ) : (
                  <>Thanh toán ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
