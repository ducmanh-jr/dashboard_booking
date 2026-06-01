// src/services/bookingService.js
// Kết nối thực với Backend Booking API
import axiosClient from '../api/axiosClient';

export const bookingService = {
    // Tạo đặt phòng mới - POST /api/bookings (cần Bearer token)
    createBooking: (bookingData) => {
        return axiosClient.post('/api/bookings', bookingData);
    },

    // Tạo phiên thanh toán cho booking - POST /api/payments/checkout/:bookingId
    checkout: (bookingId) => {
        return axiosClient.post(`/api/payments/checkout/${bookingId}`);
    },

    // Lấy danh sách đặt phòng của user hiện tại - GET /api/bookings/me (cần Bearer token)
    getMyBookings: () => {
        return axiosClient.get('/api/bookings/me');
    },

    // Yêu cầu hủy đặt phòng - POST /api/bookings/:id/request-cancel
    requestCancelBooking: (id, reason) => {
        return axiosClient.post(`/api/bookings/${id}/request-cancel`, { reason });
    },
};
