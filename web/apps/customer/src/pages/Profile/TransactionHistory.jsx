// === TransactionHistory.jsx - Trang Lịch sử giao dịch ===
// Hiển thị danh sách các giao dịch đặt chỗ của người dùng với bộ lọc và phân trang

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import {
  User, Bell, ChevronRight, ChevronLeft,
  Receipt, Heart, Settings, BedDouble, Ticket,
  Star, Camera, X
} from 'lucide-react';
import ETicketModal from '../../components/booking/ETicketModal';
import { reviewService } from '../../services/reviewService';

const TransactionHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bookings, updateBookingStatus, markBookingAsReviewed } = useBooking();

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // States cho tính năng Đánh giá từ khách thật
  const [reviewingTransaction, setReviewingTransaction] = useState(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewHoverStars, setReviewHoverStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]); // Chứa chuỗi ảnh Base64
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Dropdown lọc trạng thái
  const [statusFilter, setStatusFilter] = useState('all');
  // Trang hiện tại
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'success', label: 'Thành công' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'cancel_pending', label: 'Chờ duyệt hủy' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  // Lọc theo trạng thái
  const filteredTransactions = bookings.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'success') {
      return ['success', 'checked_in', 'checked_out', 'no_show'].includes(t.status);
    }
    return t.status === statusFilter;
  });

  const handleCancelRequest = (transactionId) => {
    updateBookingStatus(transactionId, 'cancel_pending');
    setSelectedTransaction((prev) => 
      prev?.id === transactionId ? { ...prev, status: 'cancel_pending' } : prev
    );
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const availableSlots = 5 - reviewImages.length;
    const filesToUpload = files.slice(0, availableSlots);

    filesToUpload.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setReviewImages(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim()) {
      alert("Vui lòng nhập nhận xét của bạn.");
      return;
    }

    setIsSubmittingReview(true);

    try {
      await reviewService.createReview(reviewingTransaction.id, {
        rating: reviewStars,
        comment: reviewComment,
      });

      markBookingAsReviewed(reviewingTransaction.id);

      setIsSubmittingReview(false);
      setReviewingTransaction(null);
      
      alert("Cảm ơn đóng góp của bạn! Đánh giá đã được gửi lên hệ thống.");
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Không thể gửi đánh giá.';
      setIsSubmittingReview(false);
      alert(Array.isArray(message) ? message[0] : message);
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
            {/* Avatar & thông tin tài khoản */}
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

              {/* Active - Lịch sử giao dịch */}
              <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-[#0064a3] text-white shadow-sm cursor-default">
                <Receipt className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Lịch sử giao dịch</span>
              </div>

              <Link
                to="/settings"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Cài đặt</span>
              </Link>
            </div>
          </div>

          {/* === BÊN PHẢI: Nội dung Lịch sử giao dịch === */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200 p-8 flex flex-col">

            {/* Tiêu đề trang */}
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Lịch sử giao dịch</h1>
            <p className="text-gray-500 text-sm mb-6">Xem và quản lý các giao dịch đặt chỗ của bạn</p>

            {/* Dropdown lọc trạng thái */}
            <div className="mb-5">
              <div className="relative inline-block">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#0064a3] cursor-pointer"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ====== DANH SÁCH GIAO DỊCH ====== */}
            <div className="flex flex-col gap-3 flex-1">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Receipt className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-semibold">Không có giao dịch nào</p>
                  <p className="text-sm mt-1">Hãy thử thay đổi bộ lọc tìm kiếm</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 border border-gray-200 rounded-xl px-5 py-4 bg-white"
                  >
                    {/* Icon giường (hotel) */}
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <BedDouble className="w-5 h-5 text-blue-500" />
                    </div>

                    {/* Thông tin đơn hàng */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">
                        Mã đơn: <span className="font-semibold text-gray-700">{transaction.orderCode}</span>
                      </p>
                      <p className="font-bold text-gray-900 text-sm">{transaction.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-medium border border-gray-200/50">
                          {transaction.paymentMethod === 'pay_later' 
                            ? 'Trả sau (tại khách sạn)' 
                            : transaction.paymentMethod === 'credit_card' 
                            ? 'Thẻ tín dụng' 
                            : transaction.paymentMethod === 'momo' 
                            ? 'Ví MoMo' 
                            : transaction.paymentMethod === 'zalopay' 
                            ? 'Ví ZaloPay' 
                            : transaction.paymentMethod === 'bank_transfer' 
                            ? 'Chuyển khoản' 
                            : 'Đã thanh toán'}
                        </span>
                      </div>
                    </div>

                    {/* Ngày đặt & ngày thực hiện */}
                    <div className="hidden md:block text-xs text-gray-500 min-w-[130px]">
                      <p>Ngày đặt: <span className="font-semibold text-gray-700">{transaction.dateBooked}</span></p>
                      <p className="text-gray-400 mt-0.5">{transaction.dateRange}</p>
                    </div>

                    {/* Giá tiền */}
                    <div className="min-w-[120px] text-right">
                      <span
                        className={`text-base font-bold ${
                          transaction.status === 'cancelled'
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {transaction.price}
                      </span>
                    </div>

                    {/* Trạng thái + Hành động */}
                    <div className="min-w-[120px] flex flex-col items-end gap-1">
                      {/* Badge trạng thái */}
                      {transaction.status === 'success' && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                          Thành công
                        </span>
                      )}
                      {transaction.status === 'checked_in' && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          Đang ở
                        </span>
                      )}
                      {transaction.status === 'checked_out' && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Đã trả phòng
                        </span>
                      )}
                      {transaction.status === 'no_show' && (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                          Vắng mặt
                        </span>
                      )}
                      {transaction.status === 'cancel_pending' && (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                          Chờ duyệt hủy
                        </span>
                      )}
                      {transaction.status === 'processing' && (
                        <span className="text-xs font-semibold text-orange-500">
                          Đang xử lý
                        </span>
                      )}
                      {transaction.status === 'cancelled' && (
                        <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded">
                          Đã hủy
                        </span>
                      )}

                      {/* Nút hành động */}
                      {['success', 'checked_in', 'checked_out', 'cancel_pending'].includes(transaction.status) && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Opening ETicketModal for transaction:', transaction);
                            setSelectedTransaction(transaction);
                          }}
                          className="text-[#0064a3] text-xs font-semibold hover:underline flex items-center justify-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors hover:bg-blue-100 cursor-pointer z-10 w-full"
                        >
                          <Ticket className="w-3.5 h-3.5" /> Vé điện tử
                        </button>
                      )}
                      {['success', 'checked_out'].includes(transaction.status) && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (transaction.isReviewed) return;
                            setReviewingTransaction(transaction);
                            setReviewStars(5);
                            setReviewComment('');
                            setReviewImages([]);
                          }}
                          className={`text-xs font-semibold flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer z-10 w-full mt-1 ${
                            transaction.isReviewed 
                              ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' 
                              : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                          }`}
                          disabled={transaction.isReviewed}
                        >
                          <Star className={`w-3.5 h-3.5 ${transaction.isReviewed ? 'text-gray-400 fill-gray-400' : 'text-amber-500 fill-amber-500'}`} /> 
                          {transaction.isReviewed ? 'Đã đánh giá' : 'Đánh giá ngay'}
                        </button>
                      )}
                      {transaction.status === 'processing' && (
                        <button className="text-[#0064a3] text-xs font-bold hover:underline">
                          Thanh toán ngay ›
                        </button>
                      )}
                      {transaction.status === 'cancelled' && (
                        <button className="text-gray-500 text-xs font-semibold hover:underline flex items-center gap-0.5">
                          Xem chi tiết <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ====== PHÂN TRANG ====== */}
            <div className="flex justify-center items-center gap-2 mt-8">
              {/* Nút trước */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 text-gray-500 hover:border-[#0064a3] hover:text-[#0064a3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Số trang */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                    currentPage === page
                      ? 'bg-[#0064a3] text-white border-[#0064a3]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#0064a3] hover:text-[#0064a3]'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Nút tiếp */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 text-gray-500 hover:border-[#0064a3] hover:text-[#0064a3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#f3f4f6] border-t border-gray-200 py-6 mt-auto">
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

      {/* Render Modal */}
      {selectedTransaction && (
        <ETicketModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
          onCancelRequest={handleCancelRequest}
        />
      )}

      {/* ===== MODAL VIẾT ĐÁNH GIÁ (WRITE REVIEW MODAL) ===== */}
      {reviewingTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] w-full max-w-lg rounded-[2rem] p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 font-serif">Đánh giá kỳ nghỉ của bạn</h3>
              <button 
                onClick={() => setReviewingTransaction(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Hotel Name Info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm">
              <h4 className="font-bold text-gray-900 leading-snug">{reviewingTransaction.name}</h4>
              <p className="text-gray-500 text-xs mt-1">Phòng đã ở: {reviewingTransaction.roomName}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Thời gian lưu trú: {reviewingTransaction.dateRange}</p>
            </div>

            {/* 1. Chọn số sao */}
            <div className="mb-6 text-center">
              <label className="block text-sm font-bold text-gray-700 mb-2">Đánh giá chung bằng số sao</label>
              <div className="flex justify-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = reviewHoverStars > 0 ? star <= reviewHoverStars : star <= reviewStars;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewStars(star)}
                      onMouseEnter={() => setReviewHoverStars(star)}
                      onMouseLeave={() => setReviewHoverStars(0)}
                      className="p-1 hover:scale-125 transition-transform duration-150 cursor-pointer"
                    >
                      <Star 
                        className={`w-9 h-9 ${
                          isFilled ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-[#3F3D7C] mt-2 h-4">
                {reviewStars === 5 && 'Tuyệt hảo! Không có gì để chê.'}
                {reviewStars === 4 && 'Rất tốt! Trải nghiệm đáng nhớ.'}
                {reviewStars === 3 && 'Bình thường! Có điểm cần cải thiện.'}
                {reviewStars === 2 && 'Không tốt lắm! Dịch vụ chưa đạt.'}
                {reviewStars === 1 && 'Tệ! Rất không hài lòng.'}
              </p>
            </div>

            {/* 2. Nhập nhận xét */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Nhận xét chi tiết</label>
              <textarea
                className="w-full border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#3F3D7C] focus:ring-1 focus:ring-[#3F3D7C] resize-none bg-white text-gray-800 leading-relaxed"
                rows={4}
                maxLength={500}
                placeholder="Khách sạn có gì nổi bật? Hãy chia sẻ trải nghiệm thực tế của bạn về phòng ốc, tiện nghi, dịch vụ ăn uống và thái độ phục vụ của nhân viên nhé..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              <div className="text-right text-[10px] text-gray-400 mt-1 font-medium">
                {reviewComment.length}/500 ký tự
              </div>
            </div>

            {/* 3. Tải lên hình ảnh thực tế */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-gray-400" />
                Ảnh chụp thực tế kỳ nghỉ <span className="text-xs font-normal text-gray-400">(Tối đa 5 ảnh)</span>
              </label>

              {/* Nút upload hoặc danh sách ảnh */}
              <div className="flex flex-wrap gap-3 mt-3">
                {/* Thumbnails */}
                {reviewImages.map((img, index) => (
                  <div key={index} className="w-20 h-20 rounded-xl overflow-hidden relative border border-gray-150 shadow-sm flex-shrink-0 group">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/85 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                {reviewImages.length < 5 && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#3F3D7C] bg-white flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <Camera className="w-5 h-5 text-gray-400 group-hover:text-[#3F3D7C] transition-colors" />
                    <span className="text-[10px] text-gray-400 group-hover:text-[#3F3D7C] mt-1 font-bold">Thêm ảnh</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Nút bấm */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setReviewingTransaction(null)}
                className="flex-1 py-4 rounded-xl border border-gray-250 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                disabled={isSubmittingReview}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                className="flex-1 py-4 rounded-xl bg-[#3F3D7C] hover:bg-[#2d2a4a] text-white font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#3F3D7C]/20 disabled:opacity-50"
                disabled={isSubmittingReview || !reviewComment.trim()}
              >
                {isSubmittingReview ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang gửi...
                  </>
                ) : (
                  'Gửi đánh giá'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
