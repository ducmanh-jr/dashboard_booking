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

let refreshPromise = null;

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const refreshToken = localStorage.getItem('refreshToken');

        if (
            status !== 401 ||
            !refreshToken ||
            originalRequest?._retry ||
            originalRequest?.url?.includes('/auth/refresh')
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            refreshPromise ??= axiosClient
                .post('/api/auth/refresh', { refreshToken })
                .then((res) => res.data?.data || res.data)
                .finally(() => {
                    refreshPromise = null;
                });

            const tokens = await refreshPromise;
            if (!tokens?.accessToken) {
                throw new Error('Refresh token response missing accessToken');
            }

            localStorage.setItem('accessToken', tokens.accessToken);
            if (tokens.refreshToken) {
                localStorage.setItem('refreshToken', tokens.refreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return axiosClient(originalRequest);
        } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return Promise.reject(refreshError);
        }
    },
);

export default axiosClient;
