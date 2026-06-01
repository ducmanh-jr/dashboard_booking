// === Toast.jsx - Component thông báo popup (thay thế alert) ===
// Hỗ trợ 4 loại: success, error, warning, info
// Tự động tắt sau 3.5 giây, có animation slide-in/out
// Sử dụng: import { useToast } from '../components/common/Toast';

import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ===== TOAST ITEM =====
const ToastItem = ({ id, type = 'info', title, message, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Trigger slide-in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  useEffect(() => {
    const timer = setTimeout(handleClose, 3500);
    return () => clearTimeout(timer);
  }, [handleClose]);

  const styles = {
    success: {
      bar: 'bg-emerald-500',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-700',
    },
    error: {
      bar: 'bg-red-500',
      icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-red-700',
    },
    warning: {
      bar: 'bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-amber-700',
    },
    info: {
      bar: 'bg-blue-500',
      icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-blue-700',
    },
  };

  const s = styles[type] || styles.info;

  return (
    <div
      className="relative bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden flex items-start gap-3 px-4 py-3.5 min-w-[300px] max-w-[400px] transition-all duration-300"
      style={{
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible && !leaving ? 1 : 0,
      }}
    >
      {/* Thanh màu bên trái */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar} rounded-l-2xl`} />

      {/* Icon */}
      <div className="ml-2">{s.icon}</div>

      {/* Nội dung */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-bold ${s.titleColor} leading-snug`}>{title}</p>
        )}
        {message && (
          <p className="text-sm text-gray-600 leading-snug mt-0.5">{message}</p>
        )}
      </div>

      {/* Nút đóng */}
      <button
        onClick={handleClose}
        className="text-gray-300 hover:text-gray-500 transition-colors p-0.5 flex-shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ===== TOAST CONTAINER =====
export const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none"
      style={{ pointerEvents: 'none' }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem {...t} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// ===== HOOK =====
let _idCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', title, message }) => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helpers
  const toast = {
    success: (message, title = 'Thành công') => showToast({ type: 'success', title, message }),
    error: (message, title = 'Lỗi') => showToast({ type: 'error', title, message }),
    warning: (message, title = 'Cảnh báo') => showToast({ type: 'warning', title, message }),
    info: (message, title = 'Thông báo') => showToast({ type: 'info', title, message }),
  };

  return { toasts, removeToast, toast };
};
