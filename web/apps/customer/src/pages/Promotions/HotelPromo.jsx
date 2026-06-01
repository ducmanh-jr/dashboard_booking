import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Bell, MapPin, Heart, Info, ArrowRight, Star } from 'lucide-react';

const HotelPromo = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract state if passed from the Home page card click
  const promoState = location.state || {};
  const promoTitle = promoState.title || "Voucher Cho Người Mới";
  const promoDiscount = promoState.discount || "Giảm Ngay 30%";
  
  // Update document title dynamically based on the voucher
  useEffect(() => {
    document.title = `${promoTitle} - NoWayHome`;
  }, [promoTitle]);

  // Mock data for Top Hotels matching the design
  const topHotels = [
    {
      id: 1,
      name: "Grand Sapphire Resort",
      location: "Bali, Indonesia",
      originalPrice: 2500000,
      price: 1750000,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop",
      rating: 5
    },
    {
      id: 2,
      name: "Azure Seaside Villas",
      location: "Phuket, Thailand",
      originalPrice: 3200000,
      price: 2240000,
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
      rating: 5
    },
    {
      id: 3,
      name: "Metropolitan Oasis",
      location: "Tokyo, Japan",
      originalPrice: 4500000,
      price: 3150000,
      image: "https://images.unsplash.com/photo-1551882547-ff40c0d5e9af?q=80&w=600&auto=format&fit=crop",
      rating: 5
    },
    {
      id: 4,
      name: "Alpine Zen Resort",
      location: "Swiss Alps, Switzerland",
      originalPrice: 6800000,
      price: 4760000,
      image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=600&auto=format&fit=crop",
      rating: 4
    }
  ];

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-gray-900 pb-20">
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

      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full h-[450px] flex flex-col justify-center items-center text-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2000&auto=format&fit=crop" 
            alt="Beach Road" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/70"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 max-w-[800px]">
          <div className="inline-flex items-center bg-[#fce8e8] text-[#e02424] px-4 py-1.5 rounded-full text-sm font-bold mb-6">
            <span className="mr-2">🎁</span> Ưu đãi độc quyền
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
            {promoTitle}
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a56db] mb-6">
            {promoDiscount}
          </h2>
          
          <p className="text-gray-700 text-lg md:text-lg font-medium mb-8 leading-relaxed px-4">
            Bắt đầu hành trình khám phá thế giới với AzureStay. Nhận ngay ưu đãi 30% cho lần đặt phòng đầu tiên của bạn tại hàng ngàn khách sạn cao cấp toàn cầu.
          </p>
          
          <button className="bg-[#1e1b4b] text-white font-bold px-8 py-3.5 rounded-lg hover:bg-[#312e81] transition-colors text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
            Nhận Voucher Ngay
          </button>
        </div>
      </section>

      {/* ===== TOP HOTELS SECTION ===== */}
      <section className="max-w-[1200px] mx-auto px-6 mt-20">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Top Khách Sạn Áp Dụng Giảm 30%</h2>
            <p className="text-gray-500">Lựa chọn hàng đầu cho kỳ nghỉ hoàn hảo của bạn.</p>
          </div>
          <button className="text-[#1a56db] font-medium hover:underline flex items-center">
            Xem tất cả <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topHotels.map(hotel => (
            <div key={hotel.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 group cursor-pointer flex flex-col hover:-translate-y-1">
              {/* Card Image */}
              <div className="relative h-48 overflow-hidden">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-3 left-3 bg-[#e02424] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                  -30% New User
                </div>
                <button className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
              
              {/* Card Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < hotel.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                  ))}
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{hotel.name}</h3>
                <div className="flex items-center text-gray-500 text-sm mb-4">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  <span className="truncate">{hotel.location}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 line-through mb-0.5">
                    {formatPrice(hotel.originalPrice)}
                  </div>
                  <div className="flex items-baseline text-[#1a56db]">
                    <span className="text-xl font-bold">{formatPrice(hotel.price)}</span>
                    <span className="text-xs text-gray-500 ml-1">/đêm</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TERMS AND CONDITIONS SECTION ===== */}
      <section className="max-w-[1000px] mx-auto px-6 mt-20 mb-10">
        <div className="bg-[#f9fafb] rounded-2xl p-10 text-center flex flex-col items-center border border-gray-100 shadow-sm">
          <Info className="w-7 h-7 text-gray-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-4">Điều Khoản Áp Dụng Khuyến Mãi</h3>
          <p className="text-gray-500 text-sm leading-relaxed max-w-[800px]">
            Voucher giảm 30% (tối đa 1.000.000đ) chỉ áp dụng cho tài khoản đăng ký mới chưa từng phát sinh giao dịch trên nền tảng AzureStay. 
            Thời hạn sử dụng voucher là 30 ngày kể từ ngày đăng ký. Áp dụng cho các khách sạn tham gia chương trình. 
            Giá trị voucher không thể quy đổi thành tiền mặt. Vui lòng đọc kỹ các điều khoản dịch vụ chi tiết trên trang thanh toán.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HotelPromo;
