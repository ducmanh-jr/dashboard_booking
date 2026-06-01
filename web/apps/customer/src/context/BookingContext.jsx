import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { bookingService } from '../services/bookingService';

const BookingContext = createContext();

export const useBooking = () => useContext(BookingContext);

export const BookingProvider = ({ children }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  const getBookingsKey = () => {
    return user ? `bookings_${user.id || user.email}` : 'bookings_guest';
  };

  useEffect(() => {
    const key = getBookingsKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setBookings(JSON.parse(stored));
      } catch (e) {
        console.error('Không thể parse danh sách đặt phòng từ localStorage:', e);
        setBookings([]);
      }
    } else {
      setBookings([]);
    }

    const syncBookings = async () => {
      if (!user) return;
      try {
        const response = await bookingService.getMyBookings();
        const dbBookings = response.data?.data || response.data || [];
        
        if (Array.isArray(dbBookings)) {
          const mapped = dbBookings.map(b => ({
            id: String(b.id),
            orderCode: b.bookingCode,
            name: b.property?.name || 'Khách sạn',
            paymentMethod: 'pay_later', // Mặc định do DB không lưu phương thức thanh toán này
            dateBooked: new Date(b.createdAt).toLocaleDateString('vi-VN'),
            dateRange: `${new Date(b.checkInDate).toLocaleDateString('vi-VN')} - ${new Date(b.checkOutDate).toLocaleDateString('vi-VN')}`,
            price: Number(b.totalAmount).toLocaleString('vi-VN') + ' ₫',
            status: b.status === 'cancelled'
              ? 'cancelled'
              : b.cancellationReason && b.cancellationReason.startsWith('PENDING_CANCEL')
              ? 'cancel_pending'
              : b.status === 'checked_in'
              ? 'checked_in'
              : b.status === 'checked_out'
              ? 'checked_out'
              : b.status === 'no_show'
              ? 'no_show'
              : b.status === 'pending'
              ? 'processing'
              : 'success',
            roomName: b.roomType?.name || 'Phòng tiêu chuẩn',
            isReviewed: b.review !== null && b.review !== undefined,
            propertyId: b.propertyId,
            roomTypeId: b.roomTypeId,
            startDate: b.checkInDate,
            endDate: b.checkOutDate,
          }));
          
          setBookings(mapped);
          localStorage.setItem(key, JSON.stringify(mapped));
        }
      } catch (error) {
        console.error('Lỗi khi đồng bộ danh sách đặt phòng:', error);
      }
    };

    if (user) {
      syncBookings();
      const intervalId = setInterval(syncBookings, 5000); // Polling every 5 seconds (Way 1)
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const saveBookings = (newBookings) => {
    setBookings(newBookings);
    const key = getBookingsKey();
    localStorage.setItem(key, JSON.stringify(newBookings));
  };

  const addBooking = (bookingData) => {
    const newBooking = {
      ...bookingData,
      id: Date.now().toString(),
      orderCode: `#NWH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      status: 'success',
      dateBooked: new Date().toLocaleDateString('vi-VN')
    };
    const newBookings = [newBooking, ...bookings];
    saveBookings(newBookings);
    return newBooking;
  };

  const updateBookingStatus = async (id, status) => {
    const newBookings = bookings.map(b => b.id === id ? { ...b, status } : b);
    saveBookings(newBookings);

    if (status === 'cancel_pending') {
      try {
        await bookingService.requestCancelBooking(id, 'Khách hàng yêu cầu hủy');
      } catch (e) {
        console.error('Không thể gửi yêu cầu hủy phòng lên server:', e);
      }
    }
  };

  const markBookingAsReviewed = (id) => {
    const newBookings = bookings.map(b => b.id === id ? { ...b, isReviewed: true } : b);
    saveBookings(newBookings);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        updateBookingStatus,
        markBookingAsReviewed,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};
