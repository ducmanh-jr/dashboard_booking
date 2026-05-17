import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchMyTrips, cancelBooking, mockPayBooking } from "../../../api/bookingsApi";
import { Booking, User } from "@/shared/types";
import { fmtDate, fmtVnd } from "@/shared/utils/format";
import { QRCodeSVG } from "qrcode.react";

export function TripsPage({ user }: { user: User | null }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled" | "">("");
  const [showQr, setShowQr] = useState(false);
  const [paying, setPaying] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setActiveTab("upcoming");
  }, []);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchMyTrips();
      setBookings(result.bookings || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load().catch(() => setLoading(false));
  }, [user]);

  async function cancel(id: number) {
    if (!confirm("Bạn chắc chắn muốn hủy đặt phòng này?")) return;
    await cancelBooking(id, "Khách hàng hủy trên web");
    await load();
    setSelected(null);
  }

  async function handleSimulatePay() {
    if (!selected) return;
    setPaying(true);
    try {
      await mockPayBooking(selected.id);
      alert("Thanh toán giả lập thành công!");
      await load();
      setSelected(null);
      setShowQr(false);
    } catch (e: any) {
      alert("Lỗi thanh toán: " + e.message);
    } finally {
      setPaying(false);
    }
  }

  if (!user) return <Navigate to="/login?next=/trips" replace />;
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground animate-pulse">Đang tải chuyến đi...</div>;

  const filtered = mounted ? bookings.filter(b => {
    if (activeTab === "cancelled") return b.status === "cancelled";
    if (activeTab === "completed") return b.status === "checked_out" || (b.status === "confirmed" && new Date(b.checkOutDate) < new Date());
    return b.status !== "cancelled" && (b.status === "pending" || b.status === "confirmed" || b.status === "checked_in") && new Date(b.checkOutDate) >= new Date();
  }) : [];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'cancelled': return { label: 'Đã hủy', color: 'text-red-600 bg-red-50 border-red-100', icon: '❌' };
      case 'pending': return { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: '⌛' };
      case 'confirmed': return { label: 'Đã xác nhận', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: '✅' };
      case 'checked_in': return { label: 'Đang lưu trú', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: '🏠' };
      case 'checked_out': return { label: 'Đã hoàn thành', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: '🏁' };
      default: return { label: status, color: 'text-slate-600 bg-slate-50 border-slate-100', icon: '•' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chuyến đi của tôi</h1>
          <p className="text-muted-foreground mt-1">Xem lại lịch sử đặt phòng và các chuyến đi sắp tới.</p>
        </div>
        <div className="flex p-1 bg-muted/50 rounded-xl border w-fit">
          {(["upcoming", "completed", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab 
                  ? "bg-card shadow-sm text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "upcoming" ? "Sắp tới" : tab === "completed" ? "Đã xong" : "Đã hủy"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-card border border-dashed rounded-3xl">
          <div className="text-4xl mb-4">🧳</div>
          <p className="text-muted-foreground font-medium">Bạn chưa có đặt phòng nào trong mục này.</p>
          <Link to="/search" className="inline-block mt-4 text-primary font-bold hover:underline">Khám phá khách sạn ngay →</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => {
            const status = getStatusInfo(booking.status);
            return (
              <div
                key={booking.id}
                onClick={() => setSelected(booking)}
                className="group relative bg-card border rounded-2xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="w-full sm:w-32 h-24 bg-muted rounded-xl overflow-hidden flex-shrink-0 border">
                    <img 
                      src={`https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80&sig=${booking.id}`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="" 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{booking.bookingCode}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{booking.propertyName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{booking.address}</p>
                    
                    <div className="flex items-center gap-4 pt-2 text-xs font-medium">
                       {/* Add more info if needed */}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-card border rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 relative transform animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto my-8">
            <button 
              onClick={() => { setSelected(null); setShowQr(false); }}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-bold"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
                Mã đơn: {selected.bookingCode}
              </span>
              <h2 className="text-2xl font-black pt-2 tracking-tight">{selected.propertyName}</h2>
              <p className="text-xs text-muted-foreground">{selected.address}</p>
            </div>

            <div className="border-t border-b py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider">Nhận phòng</span>
                  <span className="font-bold text-slate-800">{fmtDate(selected.checkInDate)}</span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider">Trả phòng</span>
                  <span className="font-bold text-slate-800">{fmtDate(selected.checkOutDate)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider">Số đêm lưu trú</span>
                  <span className="font-bold text-slate-800">{selected.nights} đêm</span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider">Số lượng khách</span>
                  <span className="font-bold text-slate-800">{selected.adults} Người lớn, {selected.children} Trẻ em</span>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-2xl border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông tin liên hệ & lưu trú</h4>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Họ tên khách:</span> <span className="font-semibold text-slate-700">{selected.guestName || "Không rõ"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Số điện thoại:</span> <span className="font-semibold text-slate-700">{selected.guestPhone || "Không rõ"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span className="font-semibold text-slate-700">{selected.guestEmail || "Không rõ"}</span></div>
                {selected.specialRequests && (
                  <div className="pt-2 border-t border-dashed mt-2">
                    <span className="block text-xs text-muted-foreground font-medium">Yêu cầu đặc biệt:</span>
                    <span className="text-xs text-slate-600 block mt-0.5 italic">{selected.specialRequests}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Detail */}
            <div className="flex items-center justify-between bg-primary/5 border border-primary/10 p-5 rounded-2xl">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tổng số tiền thanh toán</span>
                <span className="text-2xl font-black text-primary">{fmtVnd(selected.total)}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Trạng thái</span>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusInfo(selected.status).color}`}>
                  {getStatusInfo(selected.status).icon} {getStatusInfo(selected.status).label}
                </span>
              </div>
            </div>

            {/* Quick Check-in QR Code for reception */}
            {selected.status !== 'cancelled' && !showQr && (
              <div className="bg-slate-50 border rounded-2xl p-4 text-center space-y-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã check-in nhanh tại quầy lễ tân</span>
                <div className="flex justify-center p-3 bg-white rounded-xl shadow-inner border w-fit mx-auto">
                  <QRCodeSVG value={selected.bookingCode} size={110} />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium max-w-[280px] mx-auto">
                  Đưa mã QR chứa mã đặt phòng **{selected.bookingCode}** này cho lễ tân lúc nhận phòng để hoàn tất thủ tục check-in trong 3 giây!
                </p>
              </div>
            )}

            {/* QR Payment Simulation */}
            {showQr && (
              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-4 animate-in slide-in-from-bottom-5 duration-300">
                <div className="space-y-1">
                  <h4 className="font-bold text-md text-slate-800">Quét mã QR để thanh toán</h4>
                  <p className="text-xs text-muted-foreground">Quét mã dưới đây bằng ứng dụng Ngân hàng hoặc Ví điện tử</p>
                </div>
                <div className="flex justify-center p-4 bg-white rounded-xl shadow-inner border w-fit mx-auto">
                  <QRCodeSVG value={`${window.location.origin}/payment?bookingCode=${selected.bookingCode}`} size={160} />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleSimulatePay}
                    disabled={paying}
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50"
                  >
                    {paying ? "Đang xử lý..." : "Xác nhận đã quét & thanh toán thành công (Giả lập)"}
                  </button>
                  <button 
                    onClick={() => setShowQr(false)}
                    className="w-full text-xs font-bold text-muted-foreground hover:text-slate-700 py-1"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!showQr && (
              <div className="flex gap-3">
                {selected.status === 'pending' && selected.paymentStatus === 'unpaid' && (
                  <button 
                    onClick={() => setShowQr(true)}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 text-center"
                  >
                    💳 Thanh toán ngay
                  </button>
                )}
                
                {(selected.status === 'pending' || selected.status === 'confirmed') && (
                  <button 
                    onClick={() => { cancel(selected.id); }}
                    className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all text-center"
                  >
                    🚫 Hủy đặt phòng
                  </button>
                )}

                <button 
                  onClick={() => { setSelected(null); setShowQr(false); }}
                  className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-muted/80 transition-all text-center"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
