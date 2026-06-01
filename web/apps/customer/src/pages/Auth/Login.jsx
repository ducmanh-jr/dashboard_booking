// === Login.jsx - Trang Đăng nhập ===
// Cho phép người dùng đăng nhập bằng email/mật khẩu hoặc Google (GIS overlay)
// Gọi API thực POST /api/auth/login và POST /api/auth/google

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [googleReady, setGoogleReady] = useState(false);

  // googleBtnRef  → div nơi Google renderButton inject iframe (luôn tồn tại trong DOM)
  // formContentRef → div chứa toàn bộ form, dùng để đo width chính xác
  const googleBtnRef = useRef(null);
  const formContentRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  // Validate form đăng nhập email/password
  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập tài khoản (UUID/Email/Phone)';
    } else {
      if (email.includes('@')) {
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim())) {
          newErrors.email = 'Email không hợp lệ (yêu cầu @gmail.com)';
        }
      } else if (/^(0|\+84|84)/.test(email.trim())) {
        if (!/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(email.trim().replace(/\s/g, ''))) {
          newErrors.email = 'Số điện thoại không hợp lệ (phải đủ 10 số)';
        }
      }
    }
    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Đăng nhập email/password
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError('');
    try {
      const response = await authService.login(email.trim(), password);
      const responseData = response.data?.data || response.data;
      const { accessToken, refreshToken, user: userData } = responseData;

      login(
        {
          id: userData?.id,
          name: userData?.name || email.split('@')[0] || 'Người dùng',
          email: userData?.email || email,
          role: userData?.role,
        },
        { accessToken, refreshToken }
      );
      navigate(from);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  // Callback nhận credential (id_token) từ Google sau khi user chọn tài khoản
  const handleGoogleCredential = useCallback(async (credentialResponse) => {
    setIsGoogleLoading(true);
    setServerError('');
    try {
      const result = await authService.googleLogin(credentialResponse.credential);
      const responseData = result.data?.data || result.data;
      const { accessToken, refreshToken, user: userData } = responseData;

      login(
        {
          id: userData?.id,
          name: userData?.name || userData?.email?.split('@')[0] || 'Người dùng',
          email: userData?.email,
          role: userData?.role,
          avatar: userData?.avatar || userData?.avatarUrl,
        },
        { accessToken, refreshToken }
      );
      navigate(from);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [login, navigate, from]);

  // Khởi tạo GIS và render Google button vào googleBtnRef
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Login] VITE_GOOGLE_CLIENT_ID chưa được cấu hình trong .env');
      return;
    }

    const doRender = () => {
      if (!googleBtnRef.current || !window.google?.accounts?.id) return;

      // requestAnimationFrame đảm bảo DOM đã layout xong → offsetWidth chính xác
      requestAnimationFrame(() => {
        if (!googleBtnRef.current) return;

        // Đo width thực từ formContentRef (div chứa toàn form)
        // offsetWidth đáng tin cậy hơn getBoundingClientRect khi element đang height:0
        const formWidth = formContentRef.current?.offsetWidth || 400;

        googleBtnRef.current.innerHTML = ''; // xoá render cũ nếu có

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });

        // renderButton: cách đáng tin cậy nhất để lấy id_token
        // width = formWidth để iframe khớp đúng với container
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.floor(formWidth),
          locale: 'vi',
        });

        setGoogleReady(true);
      });
    };

    // GIS script được preload từ index.html
    if (window.google?.accounts?.id) {
      doRender();
      return;
    }

    // Chưa có → polling chờ GIS script load xong
    const poll = setInterval(() => {
      if (window.google?.accounts?.id) {
        doRender();
        clearInterval(poll);
      }
    }, 150);

    return () => clearInterval(poll);
  }, [handleGoogleCredential]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
      <div className="flex-grow flex max-w-[1440px] mx-auto w-full pt-10 px-4 md:px-10">

        {/* ===== CỘT TRÁI: Form đăng nhập ===== */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 md:px-16 lg:px-24 pb-10">

          {/* ref={formContentRef}: đo width chính xác cho renderButton */}
          <div ref={formContentRef} className="w-full max-w-md mx-auto">

            {/* Logo và slogan */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-serif font-bold text-black mb-3">NoWayHome</h1>
              <p className="text-gray-700 text-lg font-serif">Đặt phòng nhanh, trải nghiệm chất</p>
            </div>

            {/* Form đăng nhập email/password */}
            <form onSubmit={handleLogin}>
              {/* UUID / Email / Phone */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  UUID / Email / Phone
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="Nhập thông tin"
                  className={`w-full border-b py-2 text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-400 focus:border-black'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  className={`w-full border-b py-2 text-gray-900 focus:outline-none transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-400 focus:border-black'
                  }`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Quên mật khẩu */}
              <div className="flex justify-end mb-8">
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Lỗi server */}
              {serverError && (
                <p className="text-red-500 text-sm mb-4 text-center">{serverError}</p>
              )}

              {/* Nút đăng nhập */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#403B69] hover:bg-[#2d2a4a] text-white py-3 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            {/* ===== Đăng nhập Google ===== */}
            <div className="mt-10">
              {/* Separator */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  Hoặc đăng nhập với
                </p>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/*
                ===== GOOGLE BUTTON - OVERLAY APPROACH =====

                Cấu trúc (khi googleReady = true):
                ┌─────────────────────────────────────────┐ ← relative container (h-[44px])
                │  [zIndex 2] googleBtnRef div (opacity:0) │ ← Google iframe ẩn, nhận click
                │  [zIndex 1] Visual custom button         │ ← Nút đẹp, pointer-events:none
                └─────────────────────────────────────────┘

                opacity:0 KHÔNG tắt pointer-events → click vẫn đến được iframe Google
                Visual button chỉ để nhìn, click xuyên qua đến Google iframe ở trên
              */}

              {/* Spinner khi đang gọi API sau Google callback */}
              {isGoogleLoading && (
                <div className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-[10px] bg-gray-50">
                  <svg className="w-4 h-4 animate-spin text-[#403B69]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600">Đang xác thực với Google...</span>
                </div>
              )}

              {/* Placeholder khi GIS chưa render xong */}
              {!googleReady && !isGoogleLoading && (
                <div className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg py-[10px]">
                  <svg className="w-4 h-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-gray-400">Đang tải...</span>
                </div>
              )}

              {/* Overlay container - chỉ hiện khi googleReady và không loading */}
              <div
                className="relative w-full"
                style={{
                  height: googleReady && !isGoogleLoading ? '44px' : '0px',
                  overflow: 'hidden',
                  transition: 'height 0.15s ease',
                }}
              >
                {/*
                  Google button div (LUÔN trong DOM - renderButton cần DOM thực):
                  - opacity: 0 → ẩn hoàn toàn nhưng VẪN nhận click
                  - z-index: 2 → nằm TRÊN visual button
                  - position absolute phủ toàn bộ container
                */}
                <div
                  ref={googleBtnRef}
                  id="gsi-google-btn"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    opacity: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/*
                  Visual custom button (CHỈ để nhìn):
                  - pointer-events: none → KHÔNG nhận click (click xuyên qua đến Google div ở trên)
                  - z-index: 1 → nằm DƯỚI Google div
                  - Thiết kế đồng nhất với nút Đăng nhập bên trên
                */}
                <div
                  className="absolute inset-0 flex items-center justify-center gap-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ zIndex: 1, pointerEvents: 'none' }}
                >
                  {/* Logo màu chính thức của Google */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    Đăng nhập với Google
                  </span>
                </div>
              </div>
            </div>

            {/* Liên kết đăng ký & đối tác */}
            <div className="mt-12 text-center text-sm space-y-2">
              <p>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="font-bold text-[#403B69] hover:underline">
                  Đăng kí ngay
                </Link>
              </p>
              <p>
                Bạn là chủ khách sạn?{' '}
                <Link to="#" className="font-bold text-[#403B69] hover:underline">
                  Đăng nhập dành cho Đối tác
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ===== CỘT PHẢI: Ảnh minh họa ===== */}
        <div className="hidden lg:block lg:w-1/2 relative pb-10 pr-4 md:pr-0">
          <img
            src="https://images.unsplash.com/photo-1572331165267-854da2b10ccc?q=80&w=2000&auto=format&fit=crop"
            alt="Pool Deck"
            className="w-full h-full object-cover rounded-sm"
          />
        </div>
      </div>

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
    </div>
  );
};

export default Login;
