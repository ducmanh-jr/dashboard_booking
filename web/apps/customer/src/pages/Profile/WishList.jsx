import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  User, Bell,
  MapPin, Heart, Receipt, Settings, Star
} from 'lucide-react';



const WishList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist } = useWishlist();

  // Hàm định dạng giá tiền (ví dụ: 1500000 -> "1.500.000 ₫")
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
    }
    return price;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900 flex flex-col">

      {/* ===== HEADER ===== */}
      <header className="bg-[#E5E5E5] py-4 px-8 md:px-16 flex justify-between items-center shadow-sm relative z-50">
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
              <Link to="/login" className="font-bold text-[#403B69] hover:underline">Đăng nhập</Link>
              <Link to="/register" className="font-bold text-white bg-[#403B69] px-4 py-2 rounded-lg hover:bg-[#2d2a4a] transition-colors">Đăng ký</Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-[1300px] w-full mx-auto px-6 pt-10 flex-1 pb-20">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* === BÊN TRÁI: Sidebar Menu === */}
          <div className="w-full lg:w-[260px] bg-white rounded-2xl border border-gray-200 p-6 flex flex-col self-start">
            {/* Avatar & thông tin tài khoản - layout ngang */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}&hair=shortCombover&beard=medium&eyebrows=default&eyes=default&mouth=default`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-[#0064a3] text-base leading-tight truncate max-w-[145px]">
                  {user?.name || 'Tài khoản'}
                </h3>
                <p className="text-gray-500 text-xs">Premium Member</p>
              </div>
            </div>

            {/* Nút Upgrade Plan */}
            <button className="w-full bg-[#F58F00] hover:bg-[#e08200] text-white font-bold py-2 rounded-xl transition-colors mb-5 text-sm">
              Upgrade Plan
            </button>

            <hr className="border-gray-200 mb-4" />

            {/* Menu điều hướng */}
            <div className="flex flex-col space-y-0.5">
              <Link
                to="/edit-profile"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Edit Profile</span>
              </Link>

              {/* Active - Danh sách yêu thích */}
              <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-[#0064a3] text-white shadow-sm cursor-default">
                <Heart className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Danh sách yêu thích</span>
              </div>

              <Link
                to="/booking-history"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Lịch sử giao dịch</span>
              </Link>

              <Link
                to="/settings"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Cài đặt</span>
              </Link>
            </div>
          </div>

          {/* === BÊN PHẢI: Nội dung Danh sách yêu thích === */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200 p-8">
            {/* Tiêu đề */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Danh sách yêu thích</h1>
            <p className="text-gray-500 text-sm mb-8">Quản lý các chỗ nghỉ và trải nghiệm bạn đã lưu.</p>

            {/* Lưới danh sách thẻ */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {wishlist.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Heart className="w-8 h-8 text-red-400 fill-red-100" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Danh sách yêu thích trống</h3>
                  <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">Hãy khám phá các chỗ nghỉ tuyệt vời và lưu lại những nơi bạn yêu thích để chuẩn bị cho chuyến đi tiếp theo nhé!</p>
                  <Link
                    to="/search-results"
                    className="inline-block bg-[#0064a3] hover:bg-[#00508a] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                  >
                    Khám phá ngay
                  </Link>
                </div>
              ) : (
                wishlist.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                    {/* Image Container */}
                    <div className="relative h-48 w-full">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />

                      {/* Heart Button */}
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-sm"
                        title="Xóa khỏi danh sách yêu thích"
                      >
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      </button>

                      {/* Rating Tag */}
                      <div className="absolute bottom-3 left-3 bg-[#0064a3] px-2.5 py-1 rounded shadow-sm flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-white fill-white" />
                        <span className="text-xs font-bold text-white">
                          {item.rating} <span className="font-normal">({item.reviews} Đánh giá)</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 text-base mb-1 leading-tight">{item.name}</h3>

                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                        {item.location}
                      </div>

                      <div className="flex-1" />

                      {/* Footer Card */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xl font-bold text-gray-900">{formatPrice(item.price)}</span>
                          <span className="text-gray-500 text-xs ml-1">/ đêm</span>
                        </div>
                        <Link
                          to={`/hotel/${item.id}`}
                          className="bg-[#0064a3] hover:bg-[#00508a] text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors text-center"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#f3f4f6] border-t border-gray-200 py-6">
        <div className="max-w-[1300px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium">
          <div className="text-[#403B69] font-serif font-bold text-lg mb-4 md:mb-0">
            NoWayHome
          </div>
          <div className="flex space-x-6 mb-4 md:mb-0 uppercase tracking-wider">
            <Link to="#" className="hover:text-gray-800">Privacy</Link>
            <Link to="#" className="hover:text-gray-800">Terms</Link>
            <Link to="#" className="hover:text-gray-800">Cookie Policy</Link>
            <Link to="#" className="hover:text-gray-800">Feedback</Link>
          </div>
          <div className="uppercase tracking-wider">
            © 2026 NOWAYHOME. ĐẶT PHÒNG NHANH, TRẢI NGHIỆM CHẤT.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WishList;
