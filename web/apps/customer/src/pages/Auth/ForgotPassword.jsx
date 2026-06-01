// === ForgotPassword.jsx - Trang Quên mật khẩu / Khôi phục mật khẩu ===
// Có 2 bước:
//   Bước 1: Nhập email/phone để gửi yêu cầu khôi phục
//   Bước 2: Nhập mật khẩu mới và xác nhận mật khẩu

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Bell } from 'lucide-react';
import { useToast, ToastContainer } from '../../components/common/Toast';
import { authService } from '../../services/authService';

const ForgotPassword = () => {
  // State quản lý bước hiện tại (1: nhập email, 2: đặt lại mật khẩu)
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  // Xử lý gửi yêu cầu khôi phục (bước 1 → chuyển sang bước 2)
  const handleSendRequest = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Vui lòng nhập Email hoặc Số điện thoại';
    } else {
      if (identifier.includes('@')) {
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(identifier.trim())) {
          newErrors.identifier = 'Email không hợp lệ (yêu cầu @gmail.com)';
        }
      } else if (/^(0|\+84|84)/.test(identifier.trim())) {
        if (!/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(identifier.trim().replace(/\s/g, ''))) {
          newErrors.identifier = 'Số điện thoại không hợp lệ (phải đủ 10 số)';
        }
      }
    }
    setErrors(newErrors);
    
    // Nếu không có lỗi thì chuyển sang bước 2
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const response = await authService.forgotPassword(identifier.trim());
        const data = response.data?.data || response.data;
        if (data?.otp) {
          toast.success(`Mã OTP dev: ${data.otp}`, 'Đã tạo mã khôi phục');
        } else {
          toast.success('Nếu email tồn tại, mã khôi phục đã được gửi.', 'Đã gửi yêu cầu');
        }
        setStep(2);
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Không thể gửi yêu cầu khôi phục.';
        toast.error(Array.isArray(message) ? message[0] : message, 'Thất bại');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Xử lý cập nhật mật khẩu mới (bước 2)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!otp.trim()) {
      newErrors.otp = 'Vui lòng nhập mã OTP';
    }

    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu mới';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await authService.resetPassword(identifier.trim(), otp.trim(), password);
        toast.success('Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.', 'Thành công');
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Không thể cập nhật mật khẩu.';
        toast.error(Array.isArray(message) ? message[0] : message, 'Thất bại');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
      
      {/* ===== HEADER: Thanh điều hướng trên cùng ===== */}
      <header className="bg-[#e5e5e5] py-4 px-8 md:px-16 flex justify-between items-center shadow-sm">
        {/* Logo thương hiệu */}
        <div className="text-3xl font-serif font-bold text-[#403B69]">
          NoWayHome
        </div>
        {/* Khu vực thông tin user và icon */}
        <div className="flex items-center space-x-6">
          <span className="font-bold text-[#403B69] hidden md:inline-block">
            Xin chào, Duong!
          </span>
          {/* Icon người dùng */}
          <button className="text-gray-800 hover:text-black">
            <User className="w-6 h-6" />
          </button>
          {/* Icon thông báo */}
          <button className="text-gray-800 hover:text-black relative">
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ===== NỘI DUNG CHÍNH: Form khôi phục mật khẩu ===== */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 w-full max-w-[1440px] mx-auto">
        <div className="w-full max-w-lg mb-20">
          {/* Tiêu đề trang */}
          <div className="text-center mb-16">
            <h1 className="font-serif font-bold text-black" style={{ fontSize: '43px' }}>
              Khôi phục mật khẩu
            </h1>
          </div>

          {/* === BƯỚC 1: Nhập email/phone để gửi yêu cầu === */}
          {step === 1 ? (
            <form onSubmit={handleSendRequest} className="px-4 md:px-12">
              {/* Ô nhập email hoặc số điện thoại */}
              <div className="mb-10">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Email / Phone
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.identifier) setErrors({ ...errors, identifier: '' });
                  }}
                  placeholder="Nhập thông tin"
                  className={`w-full border-b py-3 text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${errors.identifier ? 'border-red-500' : 'border-gray-400 focus:border-black'}`}
                />
                {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier}</p>}
              </div>

              {/* Nút gửi yêu cầu khôi phục */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#403B69] hover:bg-[#2d2a4a] text-white py-3.5 font-semibold transition-colors mb-6 disabled:opacity-60"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>

              {/* Link quay lại trang đăng nhập */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="font-bold text-[#403B69] hover:text-[#2d2a4a] underline underline-offset-4"
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          ) : (
            /* === BƯỚC 2: Nhập mật khẩu mới và xác nhận === */
            <form onSubmit={handleUpdatePassword} className="px-4 md:px-12">
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Mã OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (errors.otp) setErrors({ ...errors, otp: '' });
                  }}
                  className={`w-full border-b py-3 text-gray-900 focus:outline-none transition-colors ${errors.otp ? 'border-red-500' : 'border-gray-400 focus:border-black'}`}
                />
                {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp}</p>}
              </div>

              {/* Ô nhập mật khẩu mới */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  className={`w-full border-b py-3 text-gray-900 focus:outline-none transition-colors ${errors.password ? 'border-red-500' : 'border-gray-400 focus:border-black'}`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Ô xác nhận mật khẩu mới */}
              <div className="mb-12">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  className={`w-full border-b py-3 text-gray-900 focus:outline-none transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400 focus:border-black'}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Nút cập nhật mật khẩu */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#403B69] hover:bg-[#2d2a4a] text-white py-3.5 font-semibold transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#f3f4f6] py-6 px-4 md:px-12 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium space-y-4 md:space-y-0">
        <div className="font-bold text-[#403B69] text-sm">NoWayHome</div>
        <div className="flex space-x-6">
          <Link to="#" className="hover:text-gray-800">PRIVACY</Link>
          <Link to="#" className="hover:text-gray-800">TERMS</Link>
          <Link to="#" className="hover:text-gray-800">COOKIE POLICY</Link>
          <Link to="#" className="hover:text-gray-800">FEEDBACK</Link>
        </div>
        <div>© 2026 NOWAYHOME. ĐẶT PHÒNG NHANH, TRẢI NGHIỆM CHẤT.</div>
      </footer>
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default ForgotPassword;
