// === Home.jsx - Trang chủ của ứng dụng ===
// Bao gồm: Header, Hero banner với thanh tìm kiếm, các section khuyến mãi, cẩm nang du lịch, Footer
// Đây là trang đầu tiên người dùng nhìn thấy khi truy cập website

import React, { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../../components/common/Toast';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../../context/AuthContext';
import {
  User, Bell, MapPin, Calendar, Search,
  Building2, CheckCircle2, Tag, MessageSquare,
  Backpack, Luggage, Umbrella, Phone, Mail, ChevronRight, Star
} from 'lucide-react';
import AppDownloadCTA from '../../components/common/AppDownloadCTA';
import { hotelService } from '../../services/hotelService';

const Home = () => {
  // Lấy thông tin user đang đăng nhập từ AuthContext (null nếu chưa đăng nhập)
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  // State cho danh sách khách sạn nổi bật (tải từ API)
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);

  // Fetch khách sạn nổi bật khi load trang
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setHotelsLoading(true);
        const res = await hotelService.searchHotels({ limit: 3, sort_by: 'highest_rating' });
        const items = res.data?.data?.items || res.data?.items || [];
        setFeaturedHotels(items.slice(0, 3));
      } catch (err) {
        console.error('Không thể tải khách sạn nổi bật:', err);
      } finally {
        setHotelsLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // === Các State quản lý thanh tìm kiếm ===
  // State lưu khoảng ngày đã chọn [ngày nhận phòng, ngày trả phòng]
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  // State lưu địa điểm người dùng nhập vào ô tìm kiếm
  const [location, setLocation] = useState('');

  // State hiển thị/ẩn popup chọn số lượng khách
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  // State lưu số lượng khách: người lớn, trẻ em, số phòng (mặc định: 2 người lớn, 0 trẻ em, 1 phòng)
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });

  // Hàm tăng/giảm số lượng khách (type: adults/children/rooms, operation: inc/dec)
  // Đảm bảo: ít nhất 1 người lớn, ít nhất 1 phòng, trẻ em không âm
  const handleGuestChange = (type, operation) => {
    setGuests(prev => {
      const newValue = operation === 'inc' ? prev[type] + 1 : prev[type] - 1;
      if (newValue < 0) return prev;
      if (type === 'adults' && newValue < 1) return prev; // At least 1 adult
      if (type === 'rooms' && newValue < 1) return prev; // At least 1 room
      return { ...prev, [type]: newValue };
    });
  };

  // Hàm xử lý khi nhấn nút Tìm kiếm
  // Tạo URL params từ thông tin tìm kiếm và chuyển hướng sang trang kết quả
  const handleSearch = () => {
    if (!location.trim() || !startDate || !endDate) {
      toast.warning('Vui lòng nhập đầy đủ địa điểm và ngày nhận - trả phòng để tìm kiếm!');
      return;
    }

    const params = new URLSearchParams();
    params.append('location', location.trim());           // Địa điểm
    params.append('startDate', startDate.toISOString()); // Ngày nhận phòng
    params.append('endDate', endDate.toISOString());       // Ngày trả phòng
    params.append('adults', guests.adults);       // Số người lớn
    params.append('children', guests.children);   // Số trẻ em
    params.append('rooms', guests.rooms);          // Số phòng

    // Điều hướng sang trang kết quả tìm kiếm kèm theo query parameters
    navigate(`/search-results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ===== HEADER: Thanh điều hướng trên cùng =====
          - Hiển thị logo NoWayHome
          - Nếu đã đăng nhập: hiện tên user, icon profile (link đến /profile), icon chuông thông báo
          - Nếu chưa đăng nhập: hiện nút Đăng nhập và Đăng ký */}
      <header className="bg-[#e5e5e5] py-4 px-8 md:px-16 flex justify-between items-center shadow-sm relative z-50">
        <div className="text-3xl font-serif font-bold text-[#403B69]">
          NoWayHome
        </div>
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

      {/* ===== HERO SECTION: Banner chính với ảnh nền và thanh tìm kiếm =====
          - Ảnh nền toàn màn hình với overlay tối
          - Tiêu đề & mô tả
          - Thanh tìm kiếm gồm: Địa điểm, Lịch chọn ngày, Số khách, Nút tìm kiếm
          - Các tag tìm kiếm phổ biến */}
      <section className="relative w-full h-[600px] flex flex-col items-center pt-24">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://plus.unsplash.com/premium_photo-1748499237782-a7c28d51e8a3?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Scenic Road"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-30 w-full max-w-[1200px] px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-md">
            Khám phá chuyến đi tiếp theo của bạn
          </h1>
          <p className="text-lg md:text-xl text-white mb-10 drop-shadow-md">
            Đặt khách sạn, vé máy bay với tour du lịch dễ dàng với giá tốt nhất
          </p>

          {/* Search Box Wrapper */}
          <div className="bg-transparent mb-6 relative z-40">
            {/* Tabs */}
            <div className="flex bg-[#f4f4f4]/90 backdrop-blur-sm rounded-t-2xl w-full shadow-lg relative z-50">
              <button className="flex-1 px-6 py-4 bg-white font-bold text-sm text-black rounded-tl-2xl">Khách sạn</button>

              {/* Transport Tab with Dropdown */}
              <div className="relative group flex-1">
                <button className="w-full px-6 py-4 text-gray-800 font-bold text-sm hover:bg-white/50 transition-colors h-full">Phương tiện di chuyển</button>
                <div className="absolute top-[calc(100%-8px)] left-0 w-48 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] py-2 hidden group-hover:block z-50 pt-2 border border-gray-100">
                  <a href="https://be.com.vn/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 font-bold transition-colors">Be</a>
                  <a href="https://www.grab.com/vn/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 font-bold transition-colors">Grab</a>
                  <a href="https://www.xanhsm.com/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-bold transition-colors">XanhSM</a>
                </div>
              </div>

              {/* Flight Tab with Dropdown */}
              <div className="relative group flex-1">
                <button className="w-full px-6 py-4 text-gray-800 font-bold text-sm hover:bg-white/50 transition-colors h-full">Vé máy bay</button>
                <div className="absolute top-[calc(100%-8px)] left-0 w-48 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] py-2 hidden group-hover:block z-50 pt-2 border border-gray-100">
                  <a href="https://www.vietnamairlines.com/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-bold transition-colors">Vietnam Airlines</a>
                  <a href="https://www.vietjetair.com/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 font-bold transition-colors">Vietjet Air</a>
                  <a href="https://www.bambooairways.com/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 font-bold transition-colors">Bamboo Airways</a>
                </div>
              </div>

              {/* Tour Tab with Dropdown */}
              <div className="relative group flex-1">
                <button className="w-full px-6 py-4 text-gray-800 font-bold text-sm hover:bg-white/50 transition-colors rounded-tr-2xl h-full">Tour du lịch</button>
                <div className="absolute top-[calc(100%-8px)] right-0 md:left-0 w-48 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] py-2 hidden group-hover:block z-50 pt-2 border border-gray-100">
                  <a href="https://www.vietravel.com/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-bold transition-colors">Vietravel</a>
                  <a href="https://www.saigontourist.net/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 font-bold transition-colors">Saigontourist</a>
                  <a href="https://mytour.vn/" target="_blank" rel="noopener noreferrer" className="block px-5 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 font-bold transition-colors">Mytour</a>
                </div>
              </div>
            </div>

            {/* Search Form */}
            <div className="bg-white p-6 rounded-b-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center">

              <div className="flex-1 w-full border border-gray-300 rounded-xl p-3 flex items-center hover:border-gray-500 transition-colors cursor-text">
                <MapPin className="w-6 h-6 text-gray-400 mr-3" />
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-sm text-gray-900">Địa điểm du lịch, tên khách sạn</span>
                  <input
                    type="text"
                    placeholder="Bạn muốn đi đâu"
                    className="text-sm text-gray-500 outline-none w-full bg-transparent"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 w-full border border-gray-300 rounded-xl p-3 flex items-center hover:border-gray-500 transition-colors cursor-pointer relative z-40">
                <Calendar className="w-6 h-6 text-gray-400 mr-3" />
                <div className="flex flex-col flex-1 w-full">
                  <span className="font-bold text-sm text-gray-900">Ngày nhận phòng - Ngày trả phòng</span>
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setDateRange(update)}
                    placeholderText="dd/mm/yyyy - dd/mm/yyyy"
                    className="text-sm text-gray-500 outline-none w-full bg-transparent cursor-pointer"
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                    portalId="root-portal"
                  />
                </div>
              </div>

              <div className="flex-1 w-full border border-gray-300 rounded-xl p-3 flex items-center hover:border-gray-500 transition-colors cursor-pointer relative z-40" onClick={() => setShowGuestPopover(!showGuestPopover)}>
                <User className="w-6 h-6 text-gray-400 mr-3" />
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-sm text-gray-900">Số lượng khách và phòng</span>
                  <span className="text-sm text-gray-500">{guests.adults} người lớn, {guests.children} trẻ em, {guests.rooms} phòng</span>
                </div>

                {/* Guest Popover */}
                {showGuestPopover && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="font-bold text-gray-800">Người lớn</div>
                        <div className="text-xs text-gray-500">Từ 13 tuổi trở lên</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleGuestChange('adults', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.adults <= 1}>-</button>
                        <span className="w-4 text-center font-medium">{guests.adults}</span>
                        <button onClick={() => handleGuestChange('adults', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="font-bold text-gray-800">Trẻ em</div>
                        <div className="text-xs text-gray-500">Dưới 13 tuổi</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleGuestChange('children', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.children <= 0}>-</button>
                        <span className="w-4 text-center font-medium">{guests.children}</span>
                        <button onClick={() => handleGuestChange('children', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800">Phòng</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleGuestChange('rooms', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.rooms <= 1}>-</button>
                        <span className="w-4 text-center font-medium">{guests.rooms}</span>
                        <button onClick={() => handleGuestChange('rooms', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleSearch} className="w-14 h-14 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 hover:scale-105 transition-all flex-shrink-0 shadow-md z-40 relative">
                <Search className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Popular Searches */}
          <div className="flex items-center space-x-3">
            <span className="text-white font-medium text-sm drop-shadow-md">Tìm kiếm phổ biến:</span>
            {['Hạ Long', 'Đà Lạt', 'Đà Nẵng', 'Nha Trang'].map((place) => (
              <button
                key={place}
                onClick={() => setLocation(place)}
                className={`px-4 py-1.5 rounded-full border text-sm transition-colors backdrop-blur-sm ${location === place ? 'bg-white text-gray-900 border-white font-bold' : 'border-white/40 bg-white/10 text-white hover:bg-white/20'}`}
              >
                {place}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS BANNER: Thanh thống kê nổi bật =====
          Hiển thị 4 chỉ số: 10.000+ Khách sạn, 1M+ Lượt đặt phòng, Giá tốt mỗi ngày, Hỗ trợ 24/7
          Nằm chồng lên Hero section (margin-top âm) */}
      <div className="max-w-[1200px] mx-auto px-6 -mt-12 relative z-10 mb-20">
        <div className="bg-[#f8f9fa] rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-200">

          <div className="flex items-start px-4 group cursor-pointer">
            <div className="p-3 bg-blue-100 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
              <Building2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">10.000+ Khách sạn</h3>
              <p className="text-xs text-gray-600">Đa dạng lựa chọn</p>
            </div>
          </div>

          <div className="flex items-start px-4 group cursor-pointer">
            <div className="p-3 bg-green-100 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">1.000.000+ Lượt đặt phòng</h3>
              <p className="text-xs text-gray-600">Thành công mỗi năm</p>
            </div>
          </div>

          <div className="flex items-start px-4 group cursor-pointer">
            <div className="p-3 bg-orange-100 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
              <Tag className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Giá tốt mỗi ngày</h3>
              <p className="text-xs text-gray-600">Cam kết giá tốt nhất cho mọi chuyến đi</p>
            </div>
          </div>

          <div className="flex items-start px-4 group cursor-pointer">
            <div className="p-3 bg-gray-200 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Hỗ trợ 24/7</h3>
              <p className="text-xs text-gray-600">Đội ngũ hỗ trợ luôn sẵn sàng phục vụ</p>
            </div>
          </div>

        </div>
      </div>

      {/* ===== KHU VỰC NỘI DUNG CHÍNH: Các section khuyến mãi & cẩm nang ===== */}
      <main className="max-w-[1200px] mx-auto px-6 space-y-20 pb-20">

        {/* --- Section 1: Khuyến mãi chỗ ở ---
            3 thẻ card ảnh: Voucher giảm 30%, Combo Đà Lạt 1999k, Combo Vé máy bay & Biệt thự
            Có hiệu ứng hover: zoom ảnh, nổi lên */}
        <section>
          <h2 className="text-3xl font-bold text-[#2a2456] mb-8">Chương trình khuyến mại chỗ ở</h2>
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <Link to="/promotions/hotel" state={{ title: "Voucher Cho Người Mới", discount: "Giảm Ngay 30%" }} className="relative h-56 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block">
                <img src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Promo" />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
                  <p className="text-white font-medium text-lg mb-1">Voucher cho người mới</p>
                  <p className="text-white font-bold text-4xl">Giảm 30%</p>
                </div>
              </Link>

              <Link to="/promotions/hotel" state={{ title: "Combo Homestay Đà Lạt 2N1Đ", discount: "Chỉ 1999k" }} className="relative h-56 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block">
                <img src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Promo" />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
                  <p className="text-white font-medium text-lg mb-1">Combo Homestay Đà Lạt 2N1Đ</p>
                  <p className="text-white font-bold text-4xl">1999k</p>
                </div>
              </Link>

              <Link to="/promotions/hotel" state={{ title: "Combo Vé Máy Bay & Biệt Thự", discount: "Ưu Đãi Đặc Biệt" }} className="relative h-56 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block">
                <img src="https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Promo" />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
                  <p className="text-white font-bold text-2xl leading-tight">Combo Vé máy bay<br />& Biệt thự</p>
                </div>
              </Link>
            </div>

            {/* Arrow Button */}
            <button className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#f4f4f4] rounded-full flex items-center justify-center shadow-md hover:bg-gray-200 hover:scale-110 transition-all z-10 hidden md:flex">
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </section>


        {/* --- Section 3: Khách sạn nổi bật --- */}
        <section>
          <h2 className="text-3xl font-bold text-[#2a2456] mb-8">Khách sạn nổi bật</h2>
          <div className="relative">
            {hotelsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-[#403B69] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : featuredHotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredHotels.map((hotel) => (
                  <Link
                    to={`/hotel/${hotel.slug}`}
                    key={hotel.slug}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={hotel.cover_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={hotel.name}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2 pr-2">{hotel.name}</h3>
                        <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-md">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-yellow-700 font-bold text-sm">{hotel.star_rating || hotel.avg_rating || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{hotel.city || hotel.address || 'Việt Nam'}</span>
                      </div>

                      <div className="mt-auto flex items-baseline">
                        <span className="text-[#2a2456] font-bold text-2xl">
                          {hotel.min_nightly_price
                            ? hotel.min_nightly_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                            : 'Liên hệ'
                          }đ
                        </span>
                        {hotel.min_nightly_price && <span className="text-gray-500 text-sm ml-1">/ đêm</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Hiện chưa có khách sạn nổi bật. Vui lòng quay lại sau.</p>
            )}

            {/* Arrow Button */}
            <button className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#f4f4f4] rounded-full flex items-center justify-center shadow-md hover:bg-gray-200 hover:scale-110 transition-all z-10 hidden md:flex">
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </section>

      </main>

      {/* ===== FOOTER: Chân trang =====
          Gồm 5 cột: Logo & giới thiệu, Về chúng tôi, Hỗ trợ, Chính sách, Tổng đài hỗ trợ 24/7 */}
      <footer className="bg-[#f3f4f6] pt-16 pb-8 border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-8 mb-16">

          {/* Col 1 */}
          <div className="md:col-span-1">
            <h2 className="text-4xl font-serif font-bold text-[#403B69] mb-4">NoWayHome</h2>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Nền tảng đặt phòng và dịch vụ du lịch uy tín hàng đầu Việt Nam.
            </p>
          </div>

          {/* Col 2 */}
          <div className="md:ml-8">
            <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider">Về chúng tôi</h3>
            <ul className="space-y-4 text-sm text-gray-600 font-medium">
              <li><Link to="#" className="hover:text-black transition-colors">Giới thiệu</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Tuyển dụng</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Tin tức</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Liên hệ</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider">Hỗ trợ</h3>
            <ul className="space-y-4 text-sm text-gray-600 font-medium">
              <li><Link to="#" className="hover:text-black transition-colors">Trung tâm hỗ trợ</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Hướng dẫn đặt phòng</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Chính sách hủy phòng</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider">Chính sách</h3>
            <ul className="space-y-4 text-sm text-gray-600 font-medium">
              <li><Link to="#" className="hover:text-black transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Chính sách thanh toán</Link></li>
              <li><Link to="#" className="hover:text-black transition-colors">Chính sách hoàn/ hủy</Link></li>
            </ul>
          </div>

          {/* Col 5 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider">Tổng đài hỗ trợ 24/7</h3>
            <div className="flex items-center space-x-3 text-sm text-[#403B69] font-bold mb-4">
              <Phone className="w-5 h-5" />
              <span className="text-base">1900 1234</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-700 font-medium">
              <Mail className="w-5 h-5" />
              <span>support@nowayhome.vn</span>
            </div>
          </div>

        </div>

        <div className="text-center text-xs text-gray-400 font-medium border-t border-gray-200 pt-8 uppercase tracking-widest">
          © 2026 NOWAYHOME. ĐẶT PHÒNG NHANH, TRẢI NGHIỆM CHẤT.
        </div>
      </footer>

      {/* Component nút nổi CTA - Tải ứng dụng (góc dưới phải màn hình) */}
      <AppDownloadCTA />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* CSS fix: Đảm bảo popup chọn ngày (react-datepicker) luôn hiển thị trên cùng */}
      <style>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
      `}</style>

    </div>
  );
};

export default Home;
