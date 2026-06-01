// === Register.jsx - Trang Đăng ký tài khoản mới ===
// Cho phép người dùng tạo tài khoản với: Họ tên, Email hoặc SĐT, Mật khẩu
// Bố cục 2 cột: form trái, ảnh phải (giống Login)
// Validation hiển thị dạng popup modal thay vì alert/inline text

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ── Popup validation / error modal ──────────────────────────────────────────
const ValidationPopup = ({ messages, onClose }) => {
  if (!messages || messages.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        animation: 'vp-fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '22px',
          padding: '36px 32px',
          maxWidth: '400px',
          width: '88%',
          boxShadow: '0 20px 60px rgba(63,61,124,0.22)',
          animation: 'vp-slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#fde8e8 0%,#fca5a5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            fontSize: '28px',
          }}
        >
          ⚠️
        </div>

        {/* Tiêu đề */}
        <h3
          style={{
            fontSize: '19px',
            fontWeight: '800',
            color: '#403B69',
            marginBottom: '14px',
          }}
        >
          Vui lòng kiểm tra lại
        </h3>

        {/* Danh sách lỗi */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 26px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {messages.map((msg, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.5',
              }}
            >
              <span style={{ color: '#ef4444', fontWeight: '700', flexShrink: 0 }}>•</span>
              {msg}
            </li>
          ))}
        </ul>

        {/* Nút đóng */}
        <button
          onClick={onClose}
          style={{
            padding: '12px 40px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg,#403B69 0%,#6c63ff 100%)',
            color: 'white',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(64,59,105,0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(64,59,105,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(64,59,105,0.35)';
          }}
        >
          Đã hiểu
        </button>
      </div>

      <style>{`
        @keyframes vp-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vp-slideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
};

// ── Main Register Component ───────────────────────────────────────────────────
const Register = () => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});  // highlight border đỏ
  const [popupMessages, setPopupMessages] = useState([]); // popup messages
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Mở popup với danh sách lỗi
  const showPopup = (msgs) => setPopupMessages(Array.isArray(msgs) ? msgs : [msgs]);
  const closePopup = () => setPopupMessages([]);

  const handleGoogleCredential = useCallback(async (credentialResponse) => {
    setIsGoogleLoading(true);
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
      navigate('/');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng nhập Google thất bại. Vui lòng thử lại.';
      showPopup(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [login, navigate]);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      showPopup('Google Client ID chưa được cấu hình.');
      return;
    }

    if (!window.google?.accounts?.id) {
      showPopup('Google Identity Services chưa sẵn sàng. Vui lòng tải lại trang và thử lại.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
    });
    window.google.accounts.id.prompt();
  };

  // Validate và trả về { valid, errors (object), messages (array) }
  const validate = () => {
    const errs = {};
    const msgs = [];

    if (!name.trim()) {
      errs.name = true;
      msgs.push('Vui lòng nhập họ và tên.');
    }

    if (!identifier.trim()) {
      errs.identifier = true;
      msgs.push('Vui lòng nhập Email hoặc Số điện thoại.');
    } else {
      const val = identifier.trim();
      if (val.includes('@')) {
        // Validate email
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
          errs.identifier = true;
          msgs.push('Địa chỉ email không hợp lệ.');
        }
      } else if (/^[0-9+]/.test(val)) {
        // Validate phone (Vietnam)
        if (!/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(val.replace(/\s/g, ''))) {
          errs.identifier = true;
          msgs.push('Số điện thoại không hợp lệ (phải đủ 10 số, đầu số VN hợp lệ).');
        }
      } else {
        errs.identifier = true;
        msgs.push('Vui lòng nhập đúng định dạng Email hoặc Số điện thoại.');
      }
    }

    if (!password.trim()) {
      errs.password = true;
      msgs.push('Vui lòng nhập mật khẩu.');
    } else if (password.length < 8) {
      errs.password = true;
      msgs.push('Mật khẩu phải có ít nhất 8 ký tự.');
    }

    if (!confirmPassword.trim()) {
      errs.confirmPassword = true;
      msgs.push('Vui lòng xác nhận mật khẩu.');
    } else if (password !== confirmPassword) {
      errs.confirmPassword = true;
      msgs.push('Mật khẩu xác nhận không khớp.');
    }

    return { valid: msgs.length === 0, errs, msgs };
  };

  // Submit
  const handleRegister = async (e) => {
    e.preventDefault();
    const { valid, errs, msgs } = validate();
    setFieldErrors(errs);

    if (!valid) {
      showPopup(msgs);
      return;
    }

    setIsLoading(true);
    try {
      await authService.register(name.trim(), identifier.trim(), password);

      const loginRes = await authService.login(identifier.trim(), password);
      const loginData = loginRes.data?.data || loginRes.data;
      const { accessToken, refreshToken, user: userData } = loginData;

      login(
        {
          id: userData?.id,
          name: userData?.name || name.trim() || 'Người dùng mới',
          email: userData?.email || identifier.trim(),
          role: userData?.role,
        },
        { accessToken, refreshToken }
      );
      navigate('/');
    } catch (err) {
      const raw =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký không thành công. Vui lòng thử lại.';

      // Server có thể trả mảng lỗi hoặc chuỗi
      if (Array.isArray(raw)) {
        showPopup(raw);
      } else {
        showPopup([typeof raw === 'string' ? raw : JSON.stringify(raw)]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: class border cho input
  const inputClass = (field) =>
    `w-full border-b py-2 text-gray-900 focus:outline-none transition-colors ${
      fieldErrors[field]
        ? 'border-red-500'
        : 'border-gray-400 focus:border-black'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
      <div className="flex-grow flex max-w-[1440px] mx-auto w-full pt-10 px-4 md:px-10">

        {/* ===== CỘT TRÁI: Form đăng ký ===== */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 md:px-16 lg:px-24 pb-10">
          <div className="w-full max-w-md mx-auto">

            {/* Logo & slogan */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-serif font-bold text-black mb-3">NoWayHome</h1>
              <p className="text-gray-700 text-lg font-serif">Đặt phòng nhanh, trải nghiệm chất</p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} noValidate>

              {/* Họ và tên */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }));
                  }}
                  placeholder="Nguyễn Văn A"
                  className={inputClass('name')}
                />
              </div>

              {/* Email / Số điện thoại */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Email / Số điện thoại
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier)
                      setFieldErrors((prev) => ({ ...prev, identifier: false }));
                  }}
                  placeholder="example@gmail.com hoặc 0912345678"
                  className={inputClass('identifier')}
                />
              </div>

              {/* Mật khẩu */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({ ...prev, password: false }));
                  }}
                  placeholder="Tối thiểu 8 ký tự"
                  className={inputClass('password')}
                />
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: false }));
                  }}
                  placeholder="Nhập lại mật khẩu"
                  className={inputClass('confirmPassword')}
                />
              </div>

              {/* Nút đăng ký */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#403B69] hover:bg-[#2d2a4a] text-white py-3 font-semibold transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang đăng ký...' : 'Đăng kí'}
              </button>
            </form>

            {/* Đăng nhập mạng xã hội */}
            <div className="mt-8">
              <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">
                Hoặc đăng nhập với
              </p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="h-12 px-5 flex items-center justify-center gap-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="font-bold text-xl text-gray-700">G</span>
                  <span className="font-semibold text-sm text-gray-700">
                    {isGoogleLoading ? 'Đang xác thực...' : 'Đăng nhập với Google'}
                  </span>
                </button>
              </div>
            </div>

            {/* Liên kết điều hướng */}
            <div className="mt-10 text-center text-sm space-y-2">
              <p>
                Bạn là chủ khách sạn?{' '}
                <Link to="#" className="font-bold text-[#403B69] hover:underline">
                  Đăng nhập dành cho Đối tác
                </Link>
              </p>
              <p className="mt-4">
                <Link to="/login" className="font-bold text-gray-500 hover:text-black hover:underline">
                  Quay lại Đăng nhập
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

      {/* ===== POPUP VALIDATION / SERVER ERROR ===== */}
      <ValidationPopup messages={popupMessages} onClose={closePopup} />
    </div>
  );
};

export default Register;
