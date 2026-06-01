// src/context/WishlistContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Tạo Context cho Danh sách yêu thích
const WishlistContext = createContext();

// Hook tùy chỉnh để sử dụng Wishlist Context trong các component con
export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  // Lấy khóa (key) lưu trữ trong localStorage dựa trên trạng thái đăng nhập
  const getWishlistKey = () => {
    return user ? `wishlist_${user.id || user.email}` : 'wishlist_guest';
  };

  // Tải danh sách yêu thích từ localStorage khi user thay đổi
  useEffect(() => {
    const key = getWishlistKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch (e) {
        console.error('Không thể parse danh sách yêu thích từ localStorage:', e);
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
  }, [user]);

  // Lưu danh sách yêu thích vào state và localStorage
  const saveWishlist = (newWishlist) => {
    setWishlist(newWishlist);
    const key = getWishlistKey();
    localStorage.setItem(key, JSON.stringify(newWishlist));
  };

  // Thêm khách sạn vào danh sách yêu thích
  const addToWishlist = (hotel) => {
    if (!hotel || !hotel.id) return;
    if (wishlist.some((item) => item.id === hotel.id)) return;
    
    // Chỉ lưu các thông tin tóm tắt cần thiết để tối ưu hóa bộ nhớ
    const simplifiedHotel = {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      rating: hotel.rating,
      reviews: hotel.reviews,
      price: hotel.price,
      image: hotel.image || (hotel.images && hotel.images[0]) || '',
      type: hotel.type || 'Khách sạn'
    };

    const newWishlist = [...wishlist, simplifiedHotel];
    saveWishlist(newWishlist);
  };

  // Xóa khách sạn khỏi danh sách yêu thích
  const removeFromWishlist = (hotelId) => {
    const newWishlist = wishlist.filter((item) => item.id !== hotelId);
    saveWishlist(newWishlist);
  };

  // Bật/tắt trạng thái yêu thích của khách sạn
  const toggleWishlist = (hotel) => {
    if (!hotel || !hotel.id) return;
    if (isInWishlist(hotel.id)) {
      removeFromWishlist(hotel.id);
    } else {
      addToWishlist(hotel);
    }
  };

  // Kiểm tra xem khách sạn đã nằm trong danh sách yêu thích chưa
  const isInWishlist = (hotelId) => {
    return wishlist.some((item) => item.id === hotelId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
