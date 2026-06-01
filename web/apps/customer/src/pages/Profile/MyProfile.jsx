// === MyProfile.jsx - Trang Hồ sơ cá nhân của người dùng ===
// Hiển thị: Thẻ thông tin (avatar, tên, email, SĐT) + Menu chức năng (Lịch sử, Yêu thích, Cài đặt) + Nút đăng xuất

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Bell, ArrowLeft, LogOut, 
  History, Heart, Settings, ChevronRight,
  Mail, Phone
} from 'lucide-react';

const MyProfile = () => {
  // Lấy thông tin user và hàm logout từ AuthContext
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Hàm xử lý đăng xuất: Xóa thông tin user và chuyển về trang chủ
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900">
      {/* ===== HEADER: Giống trang chủ ===== */}
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

      <main className="max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        {/* Nút quay lại trang trước */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-8 p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <LogOut className="w-6 h-6 text-gray-600 rotate-180" />
        </button>

        <h1 className="text-4xl font-serif font-bold text-[#403B69] text-center mb-12">
          Hồ sơ của tôi
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start px-4">
          {/* === Thẻ thông tin cá nhân: Avatar, Tên, Email, SĐT, Nút Edit === */}
          <div className="w-full lg:w-[380px] bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden mb-6 bg-blue-50 border-4 border-gray-50 shadow-inner">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}&hair=shortCombover&beard=medium&eyebrows=default&eyes=default&mouth=default`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <h2 className="text-2xl font-bold text-[#403B69] mb-4 text-center">
              {user?.name || "Nguyễn Thùy Dương"}
            </h2>
            
            <div className="space-y-4 w-full mb-10">
              <div className="flex items-center text-gray-600 text-sm bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                <Mail className="w-4 h-4 mr-3 text-[#403B69]/60" />
                <span className="font-medium truncate">{user?.email || "duong@example.com"}</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                <Phone className="w-4 h-4 mr-3 text-[#403B69]/60" />
                <span className="font-medium">{user?.phone || "+84 123 456 789"}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/edit-profile')}
              className="w-full py-3 border-2 border-[#403B69] text-[#403B69] rounded-xl font-bold hover:bg-[#403B69] hover:text-white transition-all active:scale-[0.98]">
              Edit Profile
            </button>
          </div>

          {/* === Menu chức năng: Lịch sử đặt phòng, Danh sách yêu thích, Cài đặt === */}
          <div className="w-full lg:w-[580px] bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              <Link to="/booking-history" className="group flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 rounded-xl bg-[#403B69]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <History className="w-6 h-6 text-[#403B69]" />
                  </div>
                  <span className="font-semibold text-gray-800 text-lg">Lịch sử đặt phòng</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#403B69] transition-colors" />
              </Link>

              <Link to="/wishlist" className="group flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 rounded-xl bg-[#403B69]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="w-6 h-6 text-[#403B69]" />
                  </div>
                  <span className="font-semibold text-gray-800 text-lg">Danh sách yêu thích</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#403B69] transition-colors" />
              </Link>

              <Link to="/settings" className="group flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 rounded-xl bg-[#403B69]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6 text-[#403B69]" />
                  </div>
                  <span className="font-semibold text-gray-800 text-lg">Cài đặt</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#403B69] transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Nút đăng xuất - màu đỏ, căn phải */}
        <div className="mt-12 flex justify-end max-w-[1000px] mx-auto px-4 lg:px-0">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-600 font-bold hover:text-red-700 transition-all hover:scale-105 active:scale-95"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-lg">Đăng xuất</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default MyProfile;
