import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { fetchHotelDetail } from "../../../api/hotelsApi";
import { createBooking, fetchBookingStatus } from "../../../api/bookingsApi";
import { Room, User } from "@/shared/types";
import { diffNights, fmtDate, fmtVnd, todayOffset } from "@/shared/utils/format";
import { Panel, Field, Row } from "@/shared/components/UIComponents";

export function CheckoutPage({ user }: { user: User | null }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ guestName: user?.fullName || "", guestPhone: user?.phone || "", specialRequests: "" });
  const [paymentMethod, setPaymentMethod] = useState<"hotel" | "online">("hotel");
  const [booking, setBooking] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const checkIn = params.get("checkIn") || todayOffset(1);
  const checkOut = params.get("checkOut") || todayOffset(2);
  const guests = Number(params.get("guests") || 2);
  const priceLabel = params.get("priceLabel") || "";

  useEffect(() => {
    fetchHotelDetail(id!).then((result) => setRoom(result.room));
  }, [id]);

  useEffect(() => {
    if (user) {
      setForm((old) => ({
        ...old,
        guestName: old.guestName || user.fullName || "",
        guestPhone: old.guestPhone || user.phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (booking && paymentMethod === "online" && !isPaid) {
      const timer = setInterval(async () => {
        try {
          const result = await fetchBookingStatus(booking.bookingCode);
          if (result.status === "paid") {
            setIsPaid(true);
            clearInterval(timer);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [booking, paymentMethod, isPaid]);

  const price = room?.prices.find((item) => item.label === priceLabel) || room?.prices[0];
  const nights = diffNights(checkIn, checkOut);
  const subtotal = (price?.pricePerNight || 0) * nights;
  const total = subtotal;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}`);
      return;
    }
    const phoneTrimmed = form.guestPhone.trim();
    if (!/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(phoneTrimmed)) {
      setErr("Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng số điện thoại Việt Nam (ví dụ: 0912345678).");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const result = await createBooking(id!, {
        propertyId: Number(id),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        priceLabel: price?.label,
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        adults: guests,
        children: 0,
        specialRequests: form.specialRequests,
        paymentMethod: paymentMethod,
      });
      setBooking(result.booking);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!room || !price) return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground">Đang tải checkout...</div>;
  
  if (booking) {
    const paymentUrl = `${window.location.origin}/payment?bookingCode=${booking.bookingCode}`;
    
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-card border rounded-2xl p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-300">
          {paymentMethod === "online" && !isPaid ? (
            <>
              <div className="space-y-2">
                <div className="text-primary font-bold text-sm uppercase tracking-wider">Chờ thanh toán trực tuyến</div>
                <h1 className="text-2xl font-bold">Quét QR để thanh toán</h1>
                <p className="text-muted-foreground text-sm">Dùng điện thoại quét mã dưới đây để tiếp tục thanh toán {fmtVnd(total)}</p>
              </div>
              <div className="inline-block p-6 bg-white rounded-2xl shadow-inner border-4 border-primary/10">
                <QRCodeSVG value={paymentUrl} size={200} />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Đang chờ bạn xác nhận trên điện thoại...
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">Hoặc bấm vào link dưới đây nếu bạn đang dùng điện thoại:</p>
                <a href={paymentUrl} target="_blank" className="text-primary font-bold hover:underline">Link thanh toán trực tiếp</a>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto">✓</div>
              <div className="space-y-2">
                <div className="text-green-700 font-bold text-sm uppercase tracking-wider">
                  {isPaid ? "Thanh toán thành công" : "Đặt phòng thành công"}
                </div>
                <h1 className="text-3xl font-black tracking-tight">{booking.bookingCode}</h1>
                <p className="text-muted-foreground">
                  {isPaid 
                    ? "Chúc mừng! Bạn đã thanh toán thành công đơn hàng này." 
                    : "Vui lòng thanh toán tại khách sạn khi nhận phòng."}
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <Link to="/trips" className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Xem chuyến đi</Link>
                <Link to="/" className="flex-1 py-3 rounded-xl border font-bold hover:bg-muted transition-all">Về trang chủ</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
      <section className="space-y-5">
        <Panel title="Thông tin khách">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ tên">
              <input required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Số điện thoại">
              <input required value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
          <Field label="Yêu cầu thêm">
            <textarea value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
        </Panel>
        <Panel title="Phương thức thanh toán">
          <div className="grid gap-3">
            <label className={`flex gap-3 items-start border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'hotel' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:border-slate-300'}`}>
              <input type="radio" checked={paymentMethod === 'hotel'} onChange={() => setPaymentMethod('hotel')} className="mt-1" />
              <span>
                <span className="block font-bold text-slate-800">Thanh toán tại khách sạn</span>
                <span className="text-sm text-muted-foreground">Bạn sẽ thanh toán khi đến check-in tại quầy lễ tân.</span>
              </span>
            </label>
            <label className={`flex gap-3 items-start border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'online' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:border-slate-300'}`}>
              <input type="radio" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mt-1" />
              <span>
                <span className="block font-bold text-slate-800">Thanh toán online (Mock QR)</span>
                <span className="text-sm text-muted-foreground">Sử dụng ví điện tử hoặc ngân hàng để quét mã QR thanh toán ngay.</span>
              </span>
            </label>
          </div>
        </Panel>
      </section>
      <aside className="bg-card border rounded-lg p-4 h-fit space-y-3 shadow-sm">
        <div>
          <div className="font-bold text-lg">{room.name}</div>
          <div className="text-sm text-muted-foreground">{price.label}</div>
        </div>
        <div className="text-sm border-y py-3 space-y-2">
          <Row label="Nhận phòng" value={fmtDate(checkIn)} />
          <Row label="Trả phòng" value={fmtDate(checkOut)} />
          <Row label="Số đêm" value={`${nights} đêm`} />
          <Row label="Số khách" value={`${guests} khách`} />
        </div>
        <div className="text-sm space-y-2 border-t pt-3">
          <Row label="Giá tạm tính" value={fmtVnd(subtotal)} />
          <div className="flex justify-between pt-2 border-t font-bold text-xl">
            <span>Tổng cộng</span>
            <span className="text-primary">{fmtVnd(total)}</span>
          </div>
        </div>
        {err && <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{err}</div>}
        <button disabled={loading} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
          {loading ? "Đang xử lý..." : paymentMethod === 'online' ? "Tiếp tục thanh toán" : "Xác nhận đặt phòng"}
        </button>
      </aside>
    </form>
  );
}
