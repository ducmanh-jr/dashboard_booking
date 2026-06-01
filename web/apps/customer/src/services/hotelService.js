// src/services/hotelService.js
// Kết nối thực với Backend API thay vì mock data
import axiosClient from '../api/axiosClient';

export const hotelService = {
    // Tìm kiếm khách sạn - gọi GET /api/properties/search
    searchHotels: (params) => {
        return axiosClient.get('/api/properties/search', { params });
    },

    // Lấy chi tiết khách sạn bằng slug - gọi GET /api/properties/:slug
    getHotelDetail: (slug, params) => {
        return axiosClient.get(`/api/properties/${slug}`, { params });
    },
};
