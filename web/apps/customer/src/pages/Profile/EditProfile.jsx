import React, { useState, useRef } from 'react';
import { useToast, ToastContainer } from '../../components/common/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User, Bell,
  Heart, Receipt, Settings, Camera
} from 'lucide-react';
import { authService } from '../../services/authService';

const parseDateForInput = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY to YYYY-MM-DD
  }
  return dateStr;
};

const parseGenderForSelect = (genderStr) => {
  if (genderStr === 'male') return 'Nam';
  if (genderStr === 'female') return 'Nữ';
  if (genderStr === 'other') return 'Khác';
  return genderStr || '';
};



const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toasts, removeToast, toast } = useToast();

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}&hair=shortCombover&beard=medium&eyebrows=default&eyes=default&mouth=default`);

  const [formData, setFormData] = useState({
    fullName: user?.name || user?.fullName || '',
    dateOfBirth: parseDateForInput(user?.dateOfBirth),
    gender: parseGenderForSelect(user?.gender),
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    avatar: user?.avatar || null,
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn!', 'File quá lớn');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Xóa lỗi của trường đang nhập khi người dùng thay đổi dữ liệu
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // 1. Kiểm tra không được để trống
    Object.keys(formData).forEach(key => {
      if (key !== 'avatar' && (!formData[key] || !formData[key].toString().trim())) {
        newErrors[key] = 'Trường này không được để trống';
      }
    });

    // 2. Kiểm tra email phải là gmail
    if (formData.email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email.trim())) {
      newErrors.email = 'Email phải có định dạng @gmail.com';
    }

    // 3. Kiểm tra số điện thoại Việt Nam đủ số (10 số nếu bắt đầu bằng 0, hoặc đầu +84/84)
    const phoneRegex = /^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.trim().replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const payload = {
          fullName: formData.fullName,
        };
        if (formData.phone) payload.phone = formData.phone;

        if (formData.dateOfBirth) {
           const parts = formData.dateOfBirth.split('-');
           if (parts.length === 3) {
              payload.dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
           }
        }
        if (formData.gender) {
           payload.gender = formData.gender === 'Nam' ? 'male' : (formData.gender === 'Nữ' ? 'female' : 'other');
        }

        await authService.updateProfile(payload);

        updateUser({
          ...user,
          name: formData.fullName,
          fullName: formData.fullName,
          dateOfBirth: payload.dateOfBirth || formData.dateOfBirth,
          gender: payload.gender || formData.gender,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          avatar: formData.avatar,
        });
        toast.success('Cập nhật hồ sơ thành công!', 'Lưu thành công');
      } catch (err) {
        toast.error('Có lỗi xảy ra khi lưu: ' + (err?.response?.data?.message || err.message), 'Lỗi');
      }
    }
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
                  src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&hair=shortCombover&beard=medium&eyebrows=default&eyes=default&mouth=default"}
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
              {/* Active - Edit Profile */}
              <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-[#0064a3] text-white shadow-sm cursor-default">
                <User className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Edit Profile</span>
              </div>

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

              <Link
                to="/settings"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Cài đặt</span>
              </Link>
            </div>
          </div>

          {/* === BÊN PHẢI: Form Chi Tiết Hồ Sơ === */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200 p-8 md:p-10">
            {/* Tiêu đề */}
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Chi Tiết Hồ Sơ</h1>
            <p className="text-gray-500 text-sm mb-8">Quản lý thông tin cá nhân và tùy chọn của bạn.</p>

            {/* Phần ảnh đại diện */}
            <div className="flex items-center gap-6 mb-8">
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
              />
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current.click()}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Ảnh đại diện</p>
                <p className="text-xs text-gray-400 mb-2">PNG, JPEG không quá 5MB</p>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Đổi ảnh đại diện
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Row 1: Họ và tên + Ngày sinh */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                    placeholder=""
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày sinh</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.dateOfBirth ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                    placeholder=""
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
                </div>
              </div>

              {/* Row 2: Giới tính + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.gender ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                    placeholder=""
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Row 3: Số điện thoại + Địa chỉ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                    placeholder=""
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm focus:outline-none transition-colors ${errors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#0064a3]'}`}
                    placeholder=""
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 my-2" />

              {/* Nút hành động */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white bg-[#0064a3] hover:bg-[#00508a] transition-colors"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
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

export default EditProfile;
