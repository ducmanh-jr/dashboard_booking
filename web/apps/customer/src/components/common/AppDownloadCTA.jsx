// === AppDownloadCTA.jsx - Nút nổi "Tải ứng dụng" (Call-to-Action) ===
// Hiển thị ở góc dưới phải màn hình, khi nhấn sẽ mở popup chứa mã QR để tải app
// Có 2 trạng thái: thu gọn (nút nhỏ) và mở rộng (popup QR code)

import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';

const AppDownloadCTA = () => {
  // State kiểm soát popup đang mở rộng hay thu gọn
  const [isExpanded, setIsExpanded] = useState(false);
  // State kiểm soát người dùng đã đóng/ẩn CTA chưa
  const [isDismissed, setIsDismissed] = useState(false);

  // Nếu đã bị đóng → không render gì cả
  if (isDismissed) return null;

  return (
    // Container cố định ở góc dưới phải màn hình (position: fixed)
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* ===== Popup mở rộng: Hiển thị QR Code tải app ===== */}
      {isExpanded && (
        <div
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[320px] overflow-hidden"
          style={{
            animation: 'ctaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* --- Header popup: Tiêu đề khuyến mãi với nền gradient tím --- */}
          <div className="bg-gradient-to-r from-[#403B69] to-[#5b54a4] px-6 pt-6 pb-4 text-center relative">
            <h3 className="text-white font-bold text-xl leading-tight mb-1 pr-6 pl-6">
              Tải ứng dụng để<br />nhận thêm ưu đãi
            </h3>
            <p className="text-white/80 text-sm mt-2">
              Chỉ cần quét mã QR để được giảm giá ngay
            </p>
          </div>

          {/* --- Khu vực hiển thị mã QR --- */}
          <div className="px-6 py-5 flex flex-col items-center">
            <div className="bg-[#f8f9fb] rounded-2xl p-4 border border-gray-100 shadow-inner">
              <img
                src="/qr-app-download.png"
                alt="QR Code - Tải ứng dụng NoWayHome"
                className="w-48 h-48 object-contain"
              />
            </div>
            {/* Hướng dẫn quét mã */}
            <p className="text-xs text-gray-400 mt-3 text-center">
              Mở camera điện thoại và quét mã QR
            </p>
          </div>

          {/* --- Nút đóng popup (X) ở góc trên phải --- */}
          <button
            onClick={() => {
              setIsExpanded(false);
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
            style={{ position: 'absolute', top: '16px', right: '16px' }}
            aria-label="Đóng"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* ===== Nút CTA nổi: Hiển thị khi popup đang thu gọn ===== */}
      {/* Khi nhấn → mở popup QR Code */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2.5 bg-[#3366cc] hover:bg-[#2b57b3] text-white font-bold text-sm px-6 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          style={{
            animation: 'ctaBounceIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Smartphone className="w-5 h-5" />
          Tiết kiệm nhiều hơn trên ứng dụng!
        </button>
      )}

      {/* ===== CSS Animations: Hiệu ứng trượt lên và bounce khi xuất hiện ===== */}
      <style>{`
        @keyframes ctaSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes ctaBounceIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AppDownloadCTA;
