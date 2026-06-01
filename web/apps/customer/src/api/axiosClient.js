import axios from 'axios';

const axiosClient = axios.create({
    // Lấy đường dẫn từ file .env của Vite
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Thêm Interceptor để tự động gắn Token vào mỗi request (nếu đã đăng nhập)
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken'); // Hoặc lấy từ Redux/Zustand
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default axiosClient;