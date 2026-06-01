// === Payment.jsx - Trang Thanh toán đặt phòng ===
// Gồm: Form thông tin liên hệ, Chọn phương thức thanh toán, Bảng tổng giá, Modal thành công
// Nhận dữ liệu từ trang RoomDetail qua React Router state

import React, { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../../components/common/Toast';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  User, Bell, CreditCard, Wallet, Landmark,
  Calendar, Users, ShieldCheck,
  MapPin, Ticket, Home, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import qrCodeImg from '../../assets/images/qr-code.png';
import ETicketModal from '../../components/booking/ETicketModal';
import { bookingService } from '../../services/bookingService';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để tiếp tục thanh toán!', 'Chưa đăng nhập');
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [user, navigate, location]);

  // === Lấy dữ liệu khách sạn và thông tin đặt phòng từ trang RoomDetail ===
  // Nếu không có dữ liệu (truy cập trực tiếp URL) → sử dụng dữ liệu mặc định
  const { hotel, bookingData, selectedRoom } = location.state || {
    hotel: {
      name: "Halong Elegance",
      price: 3200000,
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"],
      location: "Hạ Long, Quảng Ninh"
    },
    bookingData: {
      startDate: new Date("2026-04-25"),
      endDate: new Date("2026-04-26"),
      adults: 2,
      children: 0,
      nights: 1,
      rooms: 1
    }
  };

  const currentPrice = selectedRoom?.price || hotel.price;
  const currentRoomName = selectedRoom?.name || 'Studio Tiêu Chuẩn (Standard Studio)';

  // === State form thông tin liên hệ người đặt phòng ===
  const [contactInfo, setContactInfo] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: ''
  });
  // State form thông tin thẻ tín dụng
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });
  // State lưu lỗi validation của form
  const [errors, setErrors] = useState({});
  // State chọn phương thức thanh toán (mặc định: thẻ tín dụng)
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  // State hiển thị modal thông báo thanh toán thành công
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // State hiển thị E-Ticket
  const [showETicket, setShowETicket] = useState(false);
  // State trạng thái của E-Ticket (để demo Hủy phòng)
  const [ticketStatus, setTicketStatus] = useState('success');
  // State lưu thông tin đơn hàng vừa tạo thành công
  const [newOrder, setNewOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === Tính toán chi phí ===
  const serviceFee = 1200000;  // Phí dịch vụ cố định
  const taxRate = 0.1;         // Thuế 10%
  const subtotal = currentPrice * bookingData.nights * bookingData.rooms;  // Tiền phòng = giá/đêm × số đêm × số phòng
  const tax = subtotal * taxRate;            // Thuế
  const total = subtotal + serviceFee + tax; // Tổng cộng

  // Hàm định dạng giá tiền (ví dụ: 3200000 → "đ3,200,000")
  const formatPrice = (price) => {
    return "đ" + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Hàm định dạng ngày hiển thị trên thẻ tổng giá
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate()} - ${d.getDate() + 1} Thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
  };

  const formatDateWithSlash = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatPriceVND = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
  };

  const toDateOnly = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    return parsed.toISOString().slice(0, 10);
  };

  const unwrapResponse = (response) => response.data?.data || response.data;

  // Xử lý xác nhận thanh toán: Kiểm tra validation rồi hiển thị modal thành công
  const handleConfirmPayment = async () => {
    const newErrors = {};

    // 1. Kiểm tra không được để trống
    Object.keys(contactInfo).forEach(key => {
      if (!contactInfo[key] || !contactInfo[key].toString().trim()) {
        newErrors[key] = 'Trường này không được để trống';
      }
    });

    // 2. Kiểm tra email phải là gmail
    if (contactInfo.email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(contactInfo.email.trim())) {
      newErrors.email = 'Email phải có định dạng @gmail.com';
    }

    // 3. Kiểm tra số điện thoại Việt Nam đủ số
    const phoneRegex = /^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/;
    if (contactInfo.phone && !phoneRegex.test(contactInfo.phone.trim().replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số)';
    }

    // 4. Kiểm tra thông tin thẻ tín dụng (nếu chọn)
    if (paymentMethod === 'credit_card') {
      if (!cardInfo.cardNumber.trim()) {
        newErrors.cardNumber = 'Vui lòng nhập số thẻ';
      } else if (!/^\d{16}$/.test(cardInfo.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Số thẻ không hợp lệ (16 số)';
      }

      if (!cardInfo.expiryDate.trim()) {
        newErrors.expiryDate = 'Vui lòng nhập ngày hết hạn';
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardInfo.expiryDate)) {
        newErrors.expiryDate = 'Ngày hết hạn không hợp lệ (MM/YY)';
      }

      if (!cardInfo.cvv.trim()) {
        newErrors.cvv = 'Vui lòng nhập CVV';
      } else if (!/^\d{3,4}$/.test(cardInfo.cvv)) {
        newErrors.cvv = 'CVV không hợp lệ';
      }

      if (!cardInfo.cardName.trim()) {
        newErrors.cardName = 'Vui lòng nhập tên trên thẻ';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng kiểm tra lại thông tin thanh toán!', 'Thông tin chưa đầy đủ');
      return;
    }

    const propertyId = hotel.propertyId || hotel.id;
    const roomTypeId = selectedRoom?.id;
    const ratePlanId = selectedRoom?.ratePlanId;

    if (!propertyId || !roomTypeId || !ratePlanId) {
      toast.error('Thiếu thông tin phòng từ server. Vui lòng quay lại chọn phòng.', 'Không thể đặt phòng');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingPayload = {
        propertyId: Number(propertyId),
        roomTypeId: Number(roomTypeId),
        ratePlanId: Number(ratePlanId),
        checkInDate: toDateOnly(bookingData.startDate),
        checkOutDate: toDateOnly(bookingData.endDate),
        numAdults: Number(bookingData.adults || 1),
        numChildren: Number(bookingData.children || 0),
        roomsNeeded: Number(bookingData.rooms || 1),
        paymentMethod,
      };

      const booking = unwrapResponse(await bookingService.createBooking(bookingPayload));
      let checkout = null;

      if (paymentMethod !== 'pay_later') {
        checkout = unwrapResponse(await bookingService.checkout(booking.id));
      }

      setNewOrder({
        id: booking.id,
        orderCode: booking.bookingCode,
        name: hotel.name,
        roomName: currentRoomName,
        dateRange: `${formatDateWithSlash(bookingData.startDate)} - ${formatDateWithSlash(bookingData.endDate)}`,
        price: formatPriceVND(Number(booking.totalAmount || total)),
        paymentMethod,
        checkoutUrl: checkout?.checkoutUrl,
      });
      setShowSuccessModal(true);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Không thể tạo đặt phòng.';
      toast.error(Array.isArray(message) ? message[0] : message, 'Thanh toán thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 relative">
      {/* ===== HEADER ===== */}
      <header className="bg-[#e5e5e5] py-4 px-8 md:px-16 flex justify-between items-center shadow-sm relative z-50">
        <Link to="/" className="text-3xl font-serif font-bold text-[#403B69]">
          NoWayHome
        </Link>
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="font-bold text-[#403B69] hidden md:inline-block">
                Xin chào, {user.name}!
              </span>
              <Link to="/profile" className="text-gray-800 hover:text-black transition-transform hover:scale-110">
                <User className="w-6 h-6" />
              </Link>
              <button className="text-gray-800 hover:text-black relative transition-transform hover:scale-110">
                <Bell className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-bold text-[#403B69] hover:underline">
                Đăng nhập
              </Link>
              <Link to="/register" className="font-bold text-white bg-[#403B69] px-4 py-2 rounded-lg hover:bg-[#2d2a4a] transition-colors">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-[#403B69] mb-12">Thanh toán</h1>

        {/* ===== BỐ CỤC 2 CỘT: Form (trái) | Thẻ tổng giá (phải) ===== */}
        <div className="flex flex-col lg:flex-row gap-16">
          {/* === CỘT TRÁI: Form thông tin liên hệ + Phương thức thanh toán === */}
          <div className="flex-1">
            {/* --- Section: Thông tin liên hệ (Họ tên, Email, SĐT) --- */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-[#403B69] mb-6">Thông tin liên hệ</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nhập họ và tên trên giấy tờ"
                    className={`w-full bg-[#F3F4F6] rounded-lg px-4 py-3 focus:outline-none transition-colors border ${errors.fullName ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-transparent focus:ring-2 focus:ring-[#3F3D7C]'}`}
                    value={contactInfo.fullName}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, fullName: e.target.value });
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="example@gmail.com"
                      className={`w-full bg-[#F3F4F6] rounded-lg px-4 py-3 focus:outline-none transition-colors border ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-transparent focus:ring-2 focus:ring-[#3F3D7C]'}`}
                      value={contactInfo.email}
                      onChange={(e) => {
                        setContactInfo({ ...contactInfo, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                    <input
                      type="text"
                      placeholder="0912345678"
                      className={`w-full bg-[#F3F4F6] rounded-lg px-4 py-3 focus:outline-none transition-colors border ${errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-transparent focus:ring-2 focus:ring-[#3F3D7C]'}`}
                      value={contactInfo.phone}
                      onChange={(e) => {
                        setContactInfo({ ...contactInfo, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* --- Section: Phương thức thanh toán ---
                4 lựa chọn: Thẻ tín dụng, MoMo, ZaloPay, Chuyển khoản */}
            <section>
              <h2 className="text-xl font-bold text-[#403B69] mb-6">Phương thức thanh toán</h2>
              <div className="space-y-3">
                <PaymentOption
                  id="credit_card"
                  label="Thẻ Tín Dụng / Ghi Nợ"
                  sublabel="Visa, Mastercard, Amex, JCB"
                  icon={<CreditCard className="w-5 h-5" />}
                  selected={paymentMethod === 'credit_card'}
                  onClick={() => setPaymentMethod('credit_card')}
                />
                <PaymentOption
                  id="momo"
                  label="Ví điện tử MoMo"
                  icon={<Wallet className="w-5 h-5" />}
                  selected={paymentMethod === 'momo'}
                  onClick={() => setPaymentMethod('momo')}
                />
                <PaymentOption
                  id="zalopay"
                  label="Ví điện tử ZaloPay"
                  icon={<Wallet className="w-5 h-5" />}
                  selected={paymentMethod === 'zalopay'}
                  onClick={() => setPaymentMethod('zalopay')}
                />
                <PaymentOption
                  id="bank_transfer"
                  label="Chuyển khoản ngân hàng"
                  icon={<Landmark className="w-5 h-5" />}
                  selected={paymentMethod === 'bank_transfer'}
                  onClick={() => setPaymentMethod('bank_transfer')}
                />
                <PaymentOption
                  id="pay_later"
                  label="Thanh toán trả sau (tại khách sạn)"
                  sublabel="Thanh toán trực tiếp bằng tiền mặt hoặc thẻ khi nhận phòng"
                  icon={<Clock className="w-5 h-5" />}
                  selected={paymentMethod === 'pay_later'}
                  onClick={() => setPaymentMethod('pay_later')}
                />
              </div>

              {/* --- Thông tin Thanh toán trả sau (chỉ hiện khi chọn pay_later) --- */}
              {paymentMethod === 'pay_later' && (
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 border border-indigo-100 shadow-sm flex items-start gap-4 animate-fadeIn">
                  <div className="p-3 bg-[#403B69]/10 text-[#403B69] rounded-xl flex-shrink-0">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#403B69] text-base mb-1">Xác nhận đặt phòng & Trả sau</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Bạn có thể hoàn tất thủ tục đặt phòng ngay bây giờ mà không cần thanh toán trực tuyến.
                      Tổng số tiền <span className="font-bold text-[#403B69]">{formatPrice(total)}</span> sẽ được thanh toán trực tiếp tại quầy lễ tân của <span className="font-semibold text-gray-900">{hotel.name}</span> khi bạn đến nhận phòng.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#3F3D7C] font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      Không cần thẻ tín dụng • Xác nhận đặt phòng ngay lập tức • Hủy phòng linh hoạt
                    </div>
                  </div>
                </div>
              )}

              {/* --- Form nhập thẻ tín dụng (chỉ hiện khi chọn credit_card) ---
                  Gồm: Số thẻ, Ngày hết hạn, CVV, Tên trên thẻ */}
              {paymentMethod === 'credit_card' && (
                <div className="mt-8 space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Số thẻ</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          className={`w-full bg-[#F3F4F6] border-none rounded-lg px-4 py-3 focus:ring-2 outline-none pr-12 ${errors.cardNumber ? 'ring-2 ring-red-500' : 'focus:ring-[#3F3D7C]'}`}
                          value={cardInfo.cardNumber}
                          onChange={(e) => {
                            setCardInfo({ ...cardInfo, cardNumber: e.target.value });
                            if (errors.cardNumber) setErrors({ ...errors, cardNumber: '' });
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex space-x-1">
                          <div className="w-6 h-4 bg-gray-300 rounded-sm"></div>
                          <div className="w-6 h-4 bg-gray-400 rounded-sm"></div>
                        </div>
                      </div>
                      {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ngày hết hạn</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className={`w-full bg-[#F3F4F6] border-none rounded-lg px-4 py-3 focus:ring-2 outline-none ${errors.expiryDate ? 'ring-2 ring-red-500' : 'focus:ring-[#3F3D7C]'}`}
                        value={cardInfo.expiryDate}
                        onChange={(e) => {
                          setCardInfo({ ...cardInfo, expiryDate: e.target.value });
                          if (errors.expiryDate) setErrors({ ...errors, expiryDate: '' });
                        }}
                      />
                      {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        className={`w-full bg-[#F3F4F6] border-none rounded-lg px-4 py-3 focus:ring-2 outline-none ${errors.cvv ? 'ring-2 ring-red-500' : 'focus:ring-[#3F3D7C]'}`}
                        value={cardInfo.cvv}
                        onChange={(e) => {
                          setCardInfo({ ...cardInfo, cvv: e.target.value });
                          if (errors.cvv) setErrors({ ...errors, cvv: '' });
                        }}
                      />
                      {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Tên trên thẻ</label>
                      <input
                        type="text"
                        placeholder="NGUYEN VAN A"
                        className={`w-full bg-[#F3F4F6] border-none rounded-lg px-4 py-3 focus:ring-2 outline-none uppercase ${errors.cardName ? 'ring-2 ring-red-500' : 'focus:ring-[#3F3D7C]'}`}
                        value={cardInfo.cardName}
                        onChange={(e) => {
                          setCardInfo({ ...cardInfo, cardName: e.target.value });
                          if (errors.cardName) setErrors({ ...errors, cardName: '' });
                        }}
                      />
                      {errors.cardName && <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* --- QR Code (hiện khi chọn MoMo/ZaloPay/Chuyển khoản) ---
                  Hiển thị mã QR giả lập để quét thanh toán */}
              {(paymentMethod === 'momo' || paymentMethod === 'zalopay' || paymentMethod === 'bank_transfer') && (
                <div className="mt-8 flex flex-col items-center animate-fadeIn">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <img src={qrCodeImg} alt="QR Code" className="w-48 h-48 object-contain" />
                  </div>
                  <p className="mt-4 text-center font-bold text-gray-800 uppercase tracking-wide">
                    {paymentMethod === 'bank_transfer' ? (
                      <>
                        NGUYEN THUY DUONG<br />
                        TP Bank<br />
                        1234 567 890
                      </>
                    ) : (
                      `QUÉT MÃ ĐỂ THANH TOÁN ${paymentMethod.toUpperCase()}`
                    )}
                  </p>
                </div>
              )}

              <p className="mt-6 text-[11px] text-gray-500">
                Bằng việc tiếp tục, bạn đồng ý với <span className="underline cursor-pointer">Điều khoản dịch vụ</span> và <span className="underline cursor-pointer">Chính sách bảo mật</span> của chúng tôi.
              </p>
            </section>
          </div>

          {/* === CỘT PHẢI: Thẻ tổng giá (Price Summary Card) ===
              Hiển thị: Ảnh khách sạn, Tên, Ngày, Số khách, Chi tiết giá, Tổng cộng, Nút xác nhận */}
          <div className="w-full lg:w-[400px]">
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-100 sticky top-32">
              <div className="p-4">
                <img
                  src={hotel.images[0]}
                  alt={hotel.name}
                  className="w-full h-48 object-cover rounded-2xl"
                />
              </div>
              <div className="px-8 pb-8">
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{currentRoomName}</p>
                  <h3 className="text-2xl font-bold text-[#403B69]">{hotel.name}</h3>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-3" />
                    <span>{formatDate(bookingData.startDate)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-3" />
                    <span>{bookingData.adults + bookingData.children} khách</span>
                    <span className="mx-3 text-gray-300">•</span>
                    <span>{bookingData.nights} đêm</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 mb-8">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">CHI TIẾT GIÁ</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{formatPrice(currentPrice)} × {bookingData.nights}</span>
                      <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 underline">Phí dịch vụ</span>
                      <span className="font-medium text-gray-900">{formatPrice(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế (10%)</span>
                      <span className="font-medium text-gray-900">{formatPrice(tax)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Tổng cộng (VND)</p>
                    <p className="text-[10px] text-gray-400 italic">Bao gồm mọi khoản thuế phí</p>
                  </div>
                  <p className="text-3xl font-bold text-[#403B69] tracking-tight">
                    {formatPrice(total).replace("đ", "₫")}
                  </p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting}
                  className="w-full bg-[#3F3D7C] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#34326b] transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                </button>

                <div className="flex items-center justify-center mt-6 text-gray-400 space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[11px] font-medium">Thanh toán an toàn & bảo mật</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== MODAL THÀNH CÔNG: Hiển thị sau khi thanh toán =====
          Gồm: Thông báo chúc mừng, Mã đặt phòng, Trạng thái, Nút quay về trang chủ */}
      {/* ===== MODAL THÀNH CÔNG: Hiển thị sau khi thanh toán ===== */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}></div>
          <div className="bg-[#FAF9F6] rounded-[2rem] w-full max-w-[500px] p-6 sm:p-8 relative z-10 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            {/* Nội dung thông báo */}
            <div className="flex flex-col items-center text-center space-y-2 mb-6 mt-2">
              <h2 className="text-2xl font-bold text-gray-900 font-serif">
                Đặt phòng thành công!
              </h2>
              <p className="text-gray-700 text-sm">
                Mã đặt phòng: <span className="font-medium">{newOrder?.orderCode || '#NWH-MPSFYFBD-H3ASYI'}</span>
              </p>
              {newOrder?.checkoutUrl && (
                <a
                  href={newOrder.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3F3D7C] text-sm font-semibold underline"
                >
                  Mở cổng thanh toán
                </a>
              )}
              <p className="text-gray-500 text-sm max-w-sm mx-auto mt-4 leading-relaxed">
                Chúng tôi đã gửi email xác nhận cùng vé điện tử đến địa chỉ email của bạn. Cảm ơn bạn đã lựa chọn NoWayHome.
              </p>
            </div>

            {/* Thẻ thông tin phòng */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm text-left">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">{hotel.name}</h3>
                <p className="text-gray-500 text-sm flex items-center mt-2">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400" /> {hotel.location}
                </p>
              </div>

              <div className="h-px bg-gray-100 my-4 w-full"></div>

              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nhận phòng</p>
                  <p className="font-bold text-gray-900 mt-1.5">{formatDateWithSlash(bookingData.startDate)}</p>
                  <p className="text-gray-500 text-sm mt-0.5">14:00</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase text-left tracking-wide">Trả phòng</p>
                  <p className="font-bold text-gray-900 mt-1.5 text-left">{formatDateWithSlash(bookingData.endDate)}</p>
                  <p className="text-gray-500 text-sm mt-0.5 text-left">12:00</p>
                </div>
              </div>

              <div className="h-px bg-gray-100 my-4 w-full"></div>

              <div className="flex justify-between items-center">
                <p className="text-gray-500 text-sm">Tổng tiền</p>
                <p className="text-lg font-bold text-[#3F3D7C]">{formatPriceVND(total)}</p>
              </div>
            </div>

            {/* Các nút bấm */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowETicket(true);
                }}
                className="w-full bg-[#3F3D7C] text-white font-medium py-3.5 rounded-xl hover:bg-[#34326b] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Ticket className="w-5 h-5" /> Xem vé điện tử
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white text-[#3F3D7C] border border-[#3F3D7C] font-medium py-3.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Home className="w-5 h-5" /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== E-TICKET MODAL ===== */}
      {showETicket && (
        <ETicketModal 
          transaction={{
            id: newOrder?.orderCode || 'NWH-MPSFYFBD',
            name: hotel.name,
            roomName: currentRoomName,
            checkIn: formatDateWithSlash(bookingData.startDate),
            checkOut: formatDateWithSlash(bookingData.endDate),
            guests: `${bookingData.adults + bookingData.children} người`,
            rooms: `${bookingData.rooms} phòng`,
            status: ticketStatus,
            paymentMethod: newOrder?.paymentMethod || paymentMethod
          }} 
          onClose={() => setShowETicket(false)} 
          onCancelRequest={() => {
            setTicketStatus('cancel_pending');
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

// === Component PaymentOption: Mỗi lựa chọn phương thức thanh toán ===
// Props: id, label, sublabel, icon, selected (đang chọn?), onClick
const PaymentOption = ({ id, label, sublabel, icon, selected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
        ${selected ? 'border-[#3F3D7C] bg-[#F0F0FF]' : 'border-gray-100 hover:border-gray-200'}
      `}
    >
      <div className="flex items-center space-x-4">
        <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center
          ${selected ? 'border-[#3F3D7C]' : 'border-gray-300'}
        `}>
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#3F3D7C]" />}
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900">{label}</p>
          {sublabel && <p className="text-[11px] text-gray-500">{sublabel}</p>}
        </div>
      </div>
      <div className="text-gray-400">
        {icon}
      </div>
    </div>
  );
};

export default Payment;
