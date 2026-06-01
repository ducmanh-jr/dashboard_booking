import React, { useState, useRef } from 'react';
import { X, Download, Trash2, QrCode } from 'lucide-react';
import { toPng } from 'html-to-image';

const ETicketModal = ({ transaction, onClose, onCancelRequest }) => {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Alert state: { title, message, isSuccess }
  const [alertInfo, setAlertInfo] = useState(null);

  const handleCancelClick = () => {
    setShowCancelForm(true);
  };

  const handleSubmitCancel = () => {
    if (!cancelReason.trim()) {
      setAlertInfo({ 
        title: 'Thông báo', 
        message: 'Vui lòng nhập lý do hủy phòng.', 
        isSuccess: false 
      });
      return;
    }
    
    // Simulate API success
    setAlertInfo({ 
      title: 'Thành công', 
      message: 'Đã gửi yêu cầu hủy đặt phòng cho quản trị viên duyệt.', 
      isSuccess: true 
    });
  };

  const handleAlertClose = () => {
    const success = alertInfo?.isSuccess;
    setAlertInfo(null);
    if (success) {
      setShowCancelForm(false);
      onCancelRequest(transaction.id);
    }
  };

  const ticketRef = useRef(null);

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    
    try {
      // Ẩn thanh cuộn (overflow) tạm thời nếu có để ảnh render đẹp hơn
      const node = ticketRef.current;
      const dataUrl = await toPng(node, {
        quality: 1,
        backgroundColor: '#f8f9fc',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `e-ticket-${transaction.id || '41'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      setAlertInfo({
        title: 'Lỗi',
        message: 'Có lỗi xảy ra khi lưu vé: ' + (error.message || error),
        isSuccess: false
      });
    }
  };

  // Status mapping
  const isCancelPending = transaction.status === 'cancel_pending';
  let statusText = 'ĐÃ XÁC NHẬN';
  let statusColor = 'bg-[#d1fae5] text-[#10b981]';
  if (isCancelPending) {
    statusText = 'CHỜ DUYỆT HỦY';
    statusColor = 'bg-orange-100 text-orange-600';
  } else if (transaction.status === 'checked_in') {
    statusText = 'ĐANG Ở';
    statusColor = 'bg-blue-100 text-blue-600';
  } else if (transaction.status === 'checked_out') {
    statusText = 'ĐÃ TRẢ PHÒNG';
    statusColor = 'bg-[#d1fae5] text-[#10b981]';
  } else if (transaction.status === 'no_show') {
    statusText = 'VẮNG MẶT (NO-SHOW)';
    statusColor = 'bg-gray-100 text-gray-600';
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      
      {/* E-Ticket Container */}
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Wrapper để capture ảnh trọn vẹn */}
        <div ref={ticketRef} className="bg-[#f8f9fc] w-full flex flex-col relative pb-4">
        
        {/* Header */}
        <div className="relative pt-4 pb-3 px-6 flex items-center justify-center bg-white sticky top-0 z-10">
          <button 
            onClick={onClose}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-black" strokeWidth={2.5} />
          </button>
          <h2 className="text-xl font-bold text-gray-900 font-serif">Vé điện tử</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 bg-white flex flex-col items-center">
          {/* QR Code */}
          <div className="w-24 h-24 text-[#2d2a54] mb-3">
            <QrCode className="w-full h-full" strokeWidth={1} />
          </div>
          
          <p className="font-bold text-[#2d2a54] text-lg mb-4">
            Booking ID: {transaction.id || 41}
          </p>
        </div>

        {/* Dashed Separator */}
        <div className="w-full relative flex items-center bg-white">
          <div className="w-4 h-8 bg-[#f8f9fc] rounded-r-full absolute left-0 -translate-y-1/2"></div>
          <div className="w-full border-t-2 border-dashed border-gray-200"></div>
          <div className="w-4 h-8 bg-[#f8f9fc] rounded-l-full absolute right-0 -translate-y-1/2"></div>
        </div>

        <div className="px-6 py-5 bg-white flex flex-col">
          <h3 className="font-bold text-2xl text-gray-900 font-serif leading-tight mb-1">
            {transaction.name || 'Signature by M Village Thợ Nhuộm'}
          </h3>
          <p className="text-gray-500 text-sm mb-3">
            {transaction.roomName || 'Studio Tiêu Chuẩn (Standard Studio)'}
          </p>

          <div className="mb-5">
             <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
               {statusText}
             </span>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Nhận phòng</p>
              <p className="font-bold text-gray-900">{transaction.checkIn || '30/05/2026'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Trả phòng</p>
              <p className="font-bold text-gray-900">{transaction.checkOut || '31/05/2026'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Khách</p>
              <p className="font-bold text-gray-900">{transaction.guests || '3 người'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Phòng</p>
              <p className="font-bold text-gray-900">{transaction.rooms || '1 phòng'}</p>
            </div>
            <div className="col-span-2 mt-2 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-400 text-xs font-semibold">Thanh toán</span>
              <span className="font-bold text-[#403B69] text-xs">
                {transaction.paymentMethod === 'pay_later' 
                  ? 'Trả sau (tại khách sạn)' 
                  : transaction.paymentMethod === 'credit_card' 
                  ? 'Thẻ tín dụng / Ghi nợ'
                  : transaction.paymentMethod === 'momo'
                  ? 'Ví điện tử MoMo'
                  : transaction.paymentMethod === 'zalopay'
                  ? 'Ví điện tử ZaloPay'
                  : transaction.paymentMethod === 'bank_transfer'
                  ? 'Chuyển khoản ngân hàng'
                  : 'Đã thanh toán trực tuyến'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-0 bg-[#f8f9fc] flex flex-col gap-3">
          <button 
            onClick={handleDownloadTicket}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-[#2d2a54] text-[#2d2a54] font-semibold bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Lưu vé vào máy
          </button>
          
          {!isCancelPending && (
            <button 
              onClick={handleCancelClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-500 font-semibold bg-red-50/50 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Hủy đặt phòng
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Cancel Form Modal Overlay */}
      {showCancelForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Yêu cầu hủy đặt phòng</h3>
            <p className="text-gray-500 text-sm mb-4">
              Vui lòng nhập lý do hủy đặt phòng bên dưới:
            </p>
            
            <textarea 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#2d2a54] focus:ring-1 focus:ring-[#2d2a54] mb-6 resize-none"
              rows={4}
              placeholder="Lý do hủy phòng (Ví dụ: Thay đổi lịch trình...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            ></textarea>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Quay lại
              </button>
              <button 
                onClick={handleSubmitCancel}
                className="flex-1 py-3 rounded-xl bg-[#2d2a54] text-white font-semibold hover:bg-[#1a1835] transition-colors"
              >
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal Overlay */}
      {alertInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200">
          <div className="bg-[#4a4a4a] text-white w-full max-w-[280px] rounded-2xl flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center w-full">
              <h3 className="font-bold text-lg mb-2">{alertInfo.title}</h3>
              <p className="text-sm text-gray-200">{alertInfo.message}</p>
            </div>
            <button 
              onClick={handleAlertClose}
              className="w-full py-3 border-t border-gray-500 text-blue-400 font-bold hover:bg-white/5 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default ETicketModal;
