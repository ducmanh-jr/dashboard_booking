// === Settings.jsx - Trang Cài đặt tài khoản ===
// Quản lý tùy chọn thông báo, bảo mật, ngôn ngữ, tiền tệ và quyền riêng tư

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast, ToastContainer } from '../../components/common/Toast';
import {
  User, Bell, Settings as SettingsIcon, Heart, Receipt,
  Shield, Globe, Eye
} from 'lucide-react';



// ===== TOGGLE SWITCH COMPONENT =====
const ToggleSwitch = ({ enabled, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        enabled ? 'bg-[#0064a3]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

// ===== SECTION CARD =====
const SectionCard = ({ children }) => (
  <div className="mb-8 border-b border-gray-100 pb-8 last:border-0 last:pb-0 last:mb-0">
    {children}
  </div>
);

// ===== SECTION HEADER =====
const SectionHeader = ({ icon: Icon, title, color = '#0064a3' }) => (
  <div className="flex items-center gap-2 mb-5">
    <Icon className="w-5 h-5" style={{ color }} />
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
  </div>
);

// ===== SETTING ROW (Toggle) =====
const SettingToggleRow = ({ label, description, enabled, onChange, borderBottom = true }) => (
  <div className={`flex items-center justify-between py-4 ${borderBottom ? 'border-b border-gray-100' : ''}`}>
    <div className="flex-1 pr-4">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} />
  </div>
);

// ===== MAIN COMPONENT =====
const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  // --- Thông báo ---
  const [emailNotif, setEmailNotif] = useState(user?.settings?.emailNotif ?? true);
  const [pushNotif, setPushNotif] = useState(user?.settings?.pushNotif ?? true);
  const [smsNotif, setSmsNotif] = useState(user?.settings?.smsNotif ?? false);

  // --- Ngôn ngữ & Tiền tệ ---
  const [language, setLanguage] = useState(user?.settings?.language || 'vi');
  const [currency, setCurrency] = useState(user?.settings?.currency || 'VND');

  // --- Quyền riêng tư ---
  const [publicProfile, setPublicProfile] = useState(user?.settings?.publicProfile ?? false);
  const [dataTracking, setDataTracking] = useState(user?.settings?.dataTracking ?? true);

  const handleSave = () => {
    updateUser({
      settings: {
        emailNotif,
        pushNotif,
        smsNotif,
        language,
        currency,
        publicProfile,
        dataTracking
      }
    });
    toast.success('Cài đặt đã được lưu thành công!', 'Lưu thành công');
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

      {/* ===== MAIN LAYOUT ===== */}
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

              <Link
                to="/wishlist"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Heart className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Danh sách yêu thích</span>
              </Link>

              <Link
                to="/booking-history"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Lịch sử giao dịch</span>
              </Link>

              {/* Active - Cài đặt */}
              <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-[#0064a3] text-white shadow-sm cursor-default">
                <SettingsIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Cài đặt</span>
              </div>
            </div>
          </div>

          {/* === BÊN PHẢI: Nội dung Cài đặt === */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200 p-8 md:p-10">
            {/* Tiêu đề trang */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cài đặt tài khoản</h1>
              <p className="text-gray-500 text-sm mt-2">Quản lý tùy chọn cá nhân, bảo mật và thông báo của bạn.</p>
            </div>

            {/* ====== 1. THÔNG BÁO ====== */}
            <SectionCard>
              <SectionHeader icon={Bell} title="Thông báo" />

              <SettingToggleRow
                label="Email"
                description="Nhận cập nhật về trạng thái đặt phòng và chuyến bay qua email."
                enabled={emailNotif}
                onChange={setEmailNotif}
              />

              <SettingToggleRow
                label="Push Notifications"
                description="Nhận thông báo trực tiếp trên ứng dụng di động."
                enabled={pushNotif}
                onChange={setPushNotif}
              />

              <SettingToggleRow
                label="SMS"
                description="Nhận mã xác nhận và cảnh báo quan trọng qua tin nhắn SMS."
                enabled={smsNotif}
                onChange={setSmsNotif}
                borderBottom={false}
              />
            </SectionCard>

            {/* ====== 2. BẢO MẬT ====== */}
            <SectionCard>
              <SectionHeader icon={Shield} title="Bảo mật" color="#0064a3" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Đổi mật khẩu */}
                <div className="border border-gray-200 rounded-xl p-5">
                  <p className="text-sm font-bold text-gray-900 mb-1">Đổi mật khẩu</p>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Cập nhật mật khẩu để giữ tài khoản của bạn an toàn.
                  </p>
                  <button className="px-5 py-2 border border-gray-400 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    Đổi mật khẩu
                  </button>
                </div>

                {/* Xác thực hai yếu tố */}
                <div className="border border-gray-200 rounded-xl p-5">
                  <p className="text-sm font-bold text-gray-900 mb-1">Xác thực hai yếu tố (2FA)</p>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Tăng cường bảo mật với mã xác nhận qua SMS hoặc ứng dụng.
                  </p>
                  <button className="px-5 py-2 bg-[#0064a3] hover:bg-[#00508a] text-white rounded-lg text-sm font-semibold transition-colors">
                    Thiết lập 2FA
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* ====== 3. NGÔN NGỮ & TIỀN TỆ ====== */}
            <SectionCard>
              <SectionHeader icon={Globe} title="Ngôn ngữ & Tiền tệ" color="#0064a3" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Ngôn ngữ hiển thị */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngôn ngữ hiển thị
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:border-[#0064a3] cursor-pointer pr-10"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Tiền tệ thanh toán */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiền tệ thanh toán
                  </label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:border-[#0064a3] cursor-pointer pr-10"
                    >
                      <option value="VND">VND - Đồng Việt Nam</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ====== 4. QUYỀN RIÊNG TƯ ====== */}
            <SectionCard>
              <SectionHeader icon={Eye} title="Quyền riêng tư" color="#0064a3" />

              <SettingToggleRow
                label="Hồ sơ công khai"
                description="Cho phép người dùng khác xem đánh giá và lịch sử du lịch của bạn."
                enabled={publicProfile}
                onChange={setPublicProfile}
              />

              <SettingToggleRow
                label="Theo dõi dữ liệu để cải thiện trải nghiệm"
                description="Chia sẻ dữ liệu sử dụng ẩn danh để giúp chúng tôi cung cấp dịch vụ tốt hơn."
                enabled={dataTracking}
                onChange={setDataTracking}
                borderBottom={false}
              />
            </SectionCard>

            {/* ====== LƯU THAY ĐỔI ====== */}
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                className="px-8 py-3 bg-[#0064a3] text-white font-bold rounded-xl shadow-sm hover:bg-[#00508a] transition-colors"
              >
                Lưu thay đổi
              </button>
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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default Settings;
