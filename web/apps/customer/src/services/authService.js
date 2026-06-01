// src/services/authService.js
// Kết nối thực với Backend Auth API
import axiosClient from '../api/axiosClient';

export const authService = {
    // Đăng nhập - POST /api/auth/login
    // Body: { email, password }
    // Response: { accessToken, refreshToken, user: { id, name, email, role } }
    login: (identifier, password) => {
        const isEmail = identifier.includes('@');
        const email = isEmail ? identifier : `${identifier}@placeholder.com`;
        return axiosClient.post('/api/auth/login', { email, password });
    },

    // Đăng ký tài khoản mới - POST /api/auth/register
    // Body: { fullName, email, [phone], password, userType }
    register: (name, identifier, password) => {
        const isEmail = identifier.includes('@');
        const payload = {
            fullName: name,
            email: isEmail ? identifier : `${identifier}@placeholder.com`,
            password: password,
            userType: 'customer',
        };
        // Chỉ gửi số điện thoại nếu người dùng nhập số điện thoại (để tránh lỗi trùng phone trong database)
        if (!isEmail) {
            payload.phone = identifier;
        }

        return axiosClient.post('/api/auth/register', payload);
    },

    // Lấy thông tin user hiện tại - GET /api/auth/me (cần Bearer token)
    getMe: () => {
        return axiosClient.get('/api/auth/me');
    },

    // Đăng xuất - POST /api/auth/logout (cần Bearer token)
    logout: () => {
        return axiosClient.post('/api/auth/logout');
    },

    // Cập nhật thông tin user - PATCH /api/users/me
    updateProfile: (data) => {
        return axiosClient.patch('/api/users/me', data);
    },

    // Đăng nhập bằng Google (GIS) - POST /api/auth/google
    // Body: { credential } (id_token từ Google Identity Services)
    // Response: { accessToken, refreshToken, user: { id, name, email, role } }
    googleLogin: (credential) => {
        return axiosClient.post('/api/auth/google', { credential });
    },

    forgotPassword: (email) => {
        return axiosClient.post('/api/auth/forgot-password', { email });
    },

    resetPassword: (email, otp, newPassword) => {
        return axiosClient.post('/api/auth/reset-password', { email, otp, newPassword });
    },
};
