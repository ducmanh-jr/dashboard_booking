// === main.jsx - Điểm khởi tạo ứng dụng React ===
// File này là nơi ứng dụng React được khởi tạo và gắn vào DOM (phần tử HTML có id="root")

// Import React StrictMode để bật kiểm tra lỗi nghiêm ngặt trong quá trình phát triển
import { StrictMode } from 'react'
// Import hàm createRoot từ React 18 để render ứng dụng
import { createRoot } from 'react-dom/client'
// Import file CSS toàn cục
import './index.css'
// Import component App - thành phần gốc của ứng dụng
import App from './App.jsx'
// Import AuthProvider - cung cấp context xác thực (đăng nhập/đăng xuất) cho toàn bộ ứng dụng
import { AuthProvider } from './context/AuthContext'
// Import WishlistProvider - cung cấp context danh sách yêu thích cho toàn bộ ứng dụng
import { WishlistProvider } from './context/WishlistContext'
// Import BookingProvider - cung cấp context lưu trữ lịch sử đặt phòng cục bộ
import { BookingProvider } from './context/BookingContext'

// Khởi tạo ứng dụng React và render vào phần tử DOM có id="root"
// StrictMode: Bọc ứng dụng để phát hiện lỗi tiềm ẩn khi phát triển
// AuthProvider: Bọc App để các component con có thể truy cập thông tin đăng nhập người dùng
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <BookingProvider>
          <App />
        </BookingProvider>
      </WishlistProvider>
    </AuthProvider>
  </StrictMode>,
)
