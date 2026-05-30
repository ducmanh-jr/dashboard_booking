import { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  MinusCircle, 
  X, 
  Check, 
  Building, 
  AlertCircle,
  Receipt
} from "lucide-react";

interface Transaction {
  id: string;
  bookingCode: string;
  hotelName: string;
  partnerName: string;
  amount: number;
  type: "CUSTOMER_PAY" | "SYSTEM_PAY_TO_PARTNER" | "COMMISSION_DEDUCTION";
  method: "ONLINE" | "CASH";
  status: "SUCCESS" | "PENDING";
  createdAt: string;
}

interface DepositOrWithdrawal {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  status: string;
  createdAt: string;
}

interface PayStatus {
  registered: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  virtualCustomerAccountNumber?: string;
  walletBalance?: number;
  transactions?: Transaction[];
  depositsAndWithdrawals?: DepositOrWithdrawal[];
}

export function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PayStatus>({ registered: false });
  const [registering, setRegistering] = useState(false);
  const [step, setStep] = useState(0);
  
  // Registration fields
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Wallet TX Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
  const [isProcessingTx, setIsProcessingTx] = useState(false);

  // Invoice & Debt Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtBooking, setDebtBooking] = useState<any>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/partner/nowayhomepay/status", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      const data = await res.json();
      
      // Safety check: if data has no registered field (e.g. error response), don't wipe out state
      if (data && typeof data.registered !== 'undefined') {
        setStatus(data);
      }
    } catch (err) {
      console.error("Error loading nowayhomepay status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      alert("Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản");
      return;
    }

    setRegistering(true);
    setStep(1);

    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
        setTimeout(async () => {
          try {
            const response = await fetch("/api/partner/nowayhomepay/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bankName,
                bankAccountNumber,
                bankAccountHolder,
              }),
            });
            if (response.ok) {
              await loadStatus();
            }
          } catch (err) {
            console.error("Error registering:", err);
          } finally {
            setRegistering(false);
            setStep(0);
          }
        }, 800);
      }, 800);
    }, 800);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (txType === "WITHDRAW" && Number(txAmount) > (status.walletBalance || 0)) {
      alert("Số dư ví không đủ để thực hiện yêu cầu rút tiền này!");
      return;
    }

    setIsProcessingTx(true);
    setTimeout(async () => {
      try {
        const res = await fetch("/api/partner/nowayhomepay/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: txType,
            amount: Number(txAmount),
          }),
        });

        if (res.ok) {
          setShowTxModal(false);
          setTxAmount("");
          await loadStatus();
        } else {
          alert("Giao dịch ví thất bại!");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessingTx(false);
      }
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu cổng thanh toán...</p>
        </div>
      </div>
    );
  }

  // Registration view
  if (!status.registered) {
    return (
      <div className="mx-auto max-w-lg py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {registering ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-black text-slate-900">Đang thiết lập ví NowayhomePay</h3>
            <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát, hệ thống đang kết nối...</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Kích hoạt NowayhomePay</h2>
                <p className="text-xs text-slate-500">Cổng đối soát dòng tiền và nhận thanh toán tự động của Host</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ngân hàng thụ hưởng</label>
                <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10">
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="BIDV">BIDV</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Số tài khoản ngân hàng</label>
                <input type="text" placeholder="Ví dụ: 1019283746" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Họ và tên chủ tài khoản</label>
                <input type="text" placeholder="Ví dụ: NGUYEN VAN A" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" required />
              </div>
              <button type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition">
                Xác thực & Kết nối tài khoản
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Grouping logic for dual-column table
  const filteredTransactions = (status.transactions || []).filter((tx) => {
    const matchType = typeFilter === "all" || tx.type === typeFilter;
    const matchMethod = methodFilter === "all" || tx.method === methodFilter;
    return matchType && matchMethod;
  });

  const bookingsMap = new Map<string, any>();
  for (const tx of filteredTransactions) {
    if (!bookingsMap.has(tx.bookingCode)) {
      bookingsMap.set(tx.bookingCode, {
        bookingCode: tx.bookingCode,
        hotelName: tx.hotelName,
        method: tx.method,
        date: tx.createdAt,
        customerPay: 0,
        systemPayout: 0,
        commissionDeducted: 0,
        txList: [],
      });
    }
    const b = bookingsMap.get(tx.bookingCode)!;
    b.txList.push(tx);
    if (tx.type === "CUSTOMER_PAY") b.customerPay += tx.amount;
    if (tx.type === "SYSTEM_PAY_TO_PARTNER") b.systemPayout += tx.amount;
    if (tx.type === "COMMISSION_DEDUCTION") b.commissionDeducted += tx.amount;
  }
  const groupedBookings = Array.from(bookingsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isWalletNegative = (status.walletBalance || 0) < 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Quản lý doanh thu & dòng tiền</h2>
        <p className="text-xs text-slate-500">Giám sát doanh thu đặt phòng, thanh toán công nợ và rút tiền về tài khoản ngân hàng của bạn.</p>
      </div>

      {isWalletNegative && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
          <div className="mt-0.5 shrink-0 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Cảnh báo: Số dư ví đối tác đang bị âm!</h4>
            <p className="mt-1 text-xs text-red-700">Ví của bạn hiện đang có số dư âm là <span className="font-bold text-red-900">{status.walletBalance?.toLocaleString("vi-VN")} đ</span> do khấu trừ hoa hồng của các đơn thanh toán tại chỗ. Vui lòng thanh toán công nợ hoặc nạp tiền để tiếp tục hiển thị khách sạn trên kết quả tìm kiếm.</p>
          </div>
        </div>
      )}

      {/* Account Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Wallet Credit Card style (Platinum/Gold Card) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-5 text-amber-950 shadow-xl shadow-amber-500/20 flex flex-col justify-between border border-yellow-300">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black uppercase tracking-widest text-amber-900/70 drop-shadow-sm">Ví Doanh Thu</span>
              <span className="rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold text-amber-950 uppercase tracking-widest backdrop-blur-sm shadow-sm border border-white/30">Gold Card</span>
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight">{status.walletBalance?.toLocaleString("vi-VN")} đ</div>
          </div>

          {/* Action buttons inside the card */}
          <div className="relative z-10 mt-5 flex items-center gap-2">
            <button
              onClick={() => {
                setTxType("WITHDRAW");
                setShowTxModal(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-950 text-amber-400 hover:bg-black hover:text-yellow-400 text-[11px] font-black py-2 rounded-xl transition shadow-lg"
            >
              <ArrowUpRight size={14} /> Yêu cầu rút tiền
            </button>
            <button
              onClick={() => {
                setTxType("DEPOSIT");
                setShowTxModal(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/30 text-amber-950 hover:bg-white/50 text-[11px] font-bold py-2 rounded-xl transition backdrop-blur-sm border border-white/50"
            >
              <PlusCircle size={14} /> Nạp thêm
            </button>
          </div>
        </div>

        {/* Bank Connection Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tài khoản ngân hàng kết nối</span>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              Bank
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">{status.bankName}</h4>
              <p className="text-xs text-slate-500">{status.bankAccountNumber} - {status.bankAccountHolder}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
            Trạng thái đối soát: <span className="font-bold text-emerald-600">Đã kích hoạt đối soát tự động</span>
          </div>
        </div>

        {/* Virtual Account Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mã tài khoản thanh toán của khách</span>
          <div className="mt-3">
            <span className="inline-block rounded bg-indigo-50 px-2.5 py-1 text-sm font-black tracking-widest text-indigo-700">
              {status.virtualCustomerAccountNumber}
            </span>
            <p className="mt-1.5 text-[10px] text-slate-400 leading-normal">Mã tài khoản ngẫu nhiên này được cung cấp cho khách hàng khi thực hiện các giao dịch thanh toán online.</p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <h3 className="font-bold text-slate-900">Báo cáo dòng tiền từng Đơn đặt phòng</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả phương thức</option>
              <option value="ONLINE">Thanh toán Online</option>
              <option value="CASH">Thanh toán Tại khách sạn</option>
            </select>
          </div>
        </div>

        {groupedBookings.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">Chưa phát sinh dòng tiền nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Đặt phòng</th>
                  <th className="py-3 px-4">Khách sạn</th>
                  <th className="py-3 px-4">Phương thức</th>
                  <th className="py-3 px-4 text-right">Khách đã trả (Gross)</th>
                  <th className="py-3 px-4 text-right">Thực nhận (Net) & Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {groupedBookings.map((b) => {
                  const isOnline = b.method === "ONLINE";
                  const totalGross = b.customerPay;
                  const commissionOwed = totalGross * 0.1;
                  
                  return (
                    <tr key={b.bookingCode} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{b.bookingCode}</td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-800">{b.hotelName}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${isOnline ? "bg-slate-100 text-slate-700" : "bg-orange-50 text-orange-700"}`}>
                          {isOnline ? "Online" : "Tại khách sạn"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-slate-900">{totalGross.toLocaleString("vi-VN")} đ</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{new Date(b.date).toLocaleDateString("vi-VN")}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isOnline ? (
                          // ONLINE: Partner receives Net from System
                          b.systemPayout > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedInvoice({ ...b, type: "EARNING" });
                                setShowInvoiceModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-100 transition shadow-sm border border-emerald-100/50"
                            >
                              <Receipt size={12} />
                              <span className="font-bold text-[10px]">Đã nhận {b.systemPayout.toLocaleString("vi-VN")} đ</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] bg-slate-50 px-2.5 py-1.5 rounded-md">
                              <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-pulse" />
                              Chờ hệ thống chuyển khoản...
                            </span>
                          )
                        ) : (
                          // CASH: Partner owes Commission
                          b.commissionDeducted > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedInvoice({ ...b, type: "COMMISSION_PAID" });
                                setShowInvoiceModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 transition shadow-sm border border-slate-200"
                            >
                              <Check size={12} className="text-emerald-500" />
                              <span className="font-bold text-[10px]">Đã nộp hoa hồng ({b.commissionDeducted.toLocaleString("vi-VN")} đ)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setDebtBooking(b);
                                setShowDebtModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-red-600 hover:bg-red-100 transition border border-red-200 shadow-sm"
                            >
                              <AlertCircle size={12} />
                              <span className="font-bold text-[10px]">Nợ hoa hồng: {commissionOwed.toLocaleString("vi-VN")} đ</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal (Deposit/Withdraw) */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowTxModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
            >
              <X size={16} />
            </button>
            <h2 className="text-base font-black text-slate-900">
              {txType === "DEPOSIT" ? "Nạp tiền vào ví doanh thu" : "Rút tiền về tài khoản ngân hàng"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">Hệ thống xử lý trực tiếp với ngân hàng đã liên kết.</p>

            <form onSubmit={handleTxSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Số tiền giao dịch (VND)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 500000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tài khoản đích</label>
                <div className="mt-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed">
                  Ngân hàng: <strong className="text-slate-800">{status.bankName}</strong><br />
                  Chủ tài khoản: <strong className="text-slate-800">{status.bankAccountHolder}</strong><br />
                  Số tài khoản: <strong className="text-slate-800">{status.bankAccountNumber}</strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessingTx}
                className={`w-full text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg ${txType === "DEPOSIT" ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20" : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"}`}
              >
                {isProcessingTx ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Đang xử lý giao dịch...</span>
                  </>
                ) : (
                  <span>{txType === "DEPOSIT" ? "Xác nhận nạp tiền" : "Xác nhận yêu cầu rút tiền"}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Debt Payment Modal */}
      {showDebtModal && debtBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-5 border border-red-100">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-center text-xl font-black text-slate-900 tracking-tight">
              Thanh toán hoa hồng
            </h2>
            <p className="mt-3 text-center text-[11px] text-slate-500 leading-relaxed px-2">
              Booking <strong className="text-indigo-600">{debtBooking.bookingCode}</strong> được khách thanh toán trực tiếp bằng tiền mặt. Vui lòng thanh toán khoản phí hoa hồng <strong className="text-slate-700">10%</strong> cho nền tảng.
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <div className="flex justify-between text-xs mb-3">
                <span className="text-slate-500 font-medium">Khách đã trả (Gross):</span>
                <span className="font-bold text-slate-700">{debtBooking.customerPay.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-slate-200/60">
                <span className="font-bold text-slate-800">Cần thanh toán:</span>
                <span className="font-black text-red-600 text-base">{(debtBooking.customerPay * 0.1).toLocaleString("vi-VN")} đ</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDebtModal(false)}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-500 hover:bg-slate-200 transition"
              >
                Để sau
              </button>
              <button
                onClick={async () => {
                  setIsProcessingTx(true);
                  setTimeout(async () => {
                    alert("Thanh toán thành công! Hệ thống đã trừ tiền trong ví (hoặc giả lập quét QR).");
                    setIsProcessingTx(false);
                    setShowDebtModal(false);
                  }, 1500);
                }}
                disabled={isProcessingTx}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 shadow-lg shadow-red-600/25 transition disabled:opacity-70"
              >
                {isProcessingTx ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Thanh toán ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className={`p-6 text-white ${selectedInvoice.type === "EARNING" ? "bg-emerald-600" : "bg-slate-800"}`}>
              <button onClick={() => setShowInvoiceModal(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 hover:bg-white/20 transition"><X size={16}/></button>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-wider uppercase">{selectedInvoice.type === "EARNING" ? "Hóa đơn thu nhập" : "Hóa đơn hoa hồng"}</h2>
                  <p className="text-[10px] text-white/80 font-medium mt-0.5">{selectedInvoice.hotelName}</p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Mã đặt phòng</span>
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedInvoice.bookingCode}</span>
              </div>
              
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Khách đã thanh toán (Tổng)</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.customerPay.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Phí nền tảng (10%)</span>
                  <span className="font-bold text-red-500">- {(selectedInvoice.customerPay * 0.1).toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
              
              <div className="mt-6 border-t-2 border-dashed border-slate-200 pt-5 flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                  {selectedInvoice.type === "EARNING" ? "Thực nhận về ví" : "Đã nộp hoa hồng"}
                </span>
                <span className={`text-xl font-black tracking-tight ${selectedInvoice.type === "EARNING" ? "text-emerald-600" : "text-slate-800"}`}>
                  {selectedInvoice.type === "EARNING" ? selectedInvoice.systemPayout.toLocaleString("vi-VN") : selectedInvoice.commissionDeducted.toLocaleString("vi-VN")} đ
                </span>
              </div>
              
              <div className="mt-8 text-center text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-4">
                Cảm ơn bạn đã hợp tác cùng NOWAYHOME.<br />Trân trọng.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
