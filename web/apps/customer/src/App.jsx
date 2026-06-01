// === App.jsx - Cấu hình định tuyến (Routing) cho toàn bộ ứng dụng ===
// File này định nghĩa tất cả các đường dẫn (URL) và trang tương ứng của ứng dụng

// Import BrowserRouter, Routes, Route để thiết lập hệ thống điều hướng trang (React Router)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// === Import các trang Xác thực (Auth) ===
import Login from './pages/Auth/Login';           // Trang đăng nhập
import Register from './pages/Auth/Register';     // Trang đăng ký tài khoản

import ForgotPassword from './pages/Auth/ForgotPassword'; // Trang quên mật khẩu

// === Import các trang Khách sạn (Hotel) ===
import Home from './pages/Hotel/Home';                   // Trang chủ
import SearchResults from './pages/Hotel/SearchResults'; // Trang kết quả tìm kiếm khách sạn
import RoomDetail from './pages/Hotel/RoomDetail';       // Trang chi tiết phòng khách sạn
import Payment from './pages/Booking/Payment';             // Trang thanh toán đặt phòng

// === Import trang Hồ sơ người dùng ===
import MyProfile from './pages/Profile/MyProfile';       // Trang thông tin cá nhân
import EditProfile from './pages/Profile/EditProfile';   // Trang chỉnh sửa hồ sơ
import WishList from './pages/Profile/WishList';         // Trang danh sách yêu thích
import TransactionHistory from './pages/Profile/TransactionHistory'; // Trang lịch sử giao dịch
import Settings from './pages/Profile/Settings';                   // Trang cài đặt tài khoản

// === Import các trang Khuyến mãi (Promotions) ===
import HotelPromo from './pages/Promotions/HotelPromo';       // Trang chi tiết khuyến mãi chỗ ở
import ScrollToTop from './components/common/ScrollToTop';    // Tự động cuộn lên đầu trang khi chuyển hướng

// === Component App - Định nghĩa hệ thống điều hướng ===
function App() {
  return (
    // BrowserRouter: Bọc toàn bộ ứng dụng để sử dụng routing dựa trên URL trình duyệt
    <BrowserRouter>
      <ScrollToTop />
      {/* Routes: Chứa danh sách các Route - mỗi Route là 1 đường dẫn URL */}
      <Routes>
        {/* Route "/" → Trang chủ (Home) */}
        <Route path="/" element={<Home />} />
        {/* Route "/login" → Trang đăng nhập */}
        <Route path="/login" element={<Login />} />
        {/* Route "/register" → Trang đăng ký */}
        <Route path="/register" element={<Register />} />
        {/* Route "/forgot-password" → Trang quên mật khẩu */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* Route "/search-results" → Trang kết quả tìm kiếm (có query params: location, startDate, endDate, adults, children, rooms) */}
        <Route path="/search-results" element={<SearchResults />} />
        {/* Route "/hotel/:id" → Trang chi tiết phòng (id là tham số động, ví dụ: /hotel/hl1) */}
        <Route path="/hotel/:id" element={<RoomDetail />} />
        {/* Route "/payment" → Trang thanh toán (nhận dữ liệu đặt phòng qua React Router state) */}
        <Route path="/payment" element={<Payment />} />
        {/* Route "/profile" → Trang hồ sơ cá nhân */}
        <Route path="/profile" element={<MyProfile />} />
        {/* Route "/edit-profile" → Trang chỉnh sửa hồ sơ */}
        <Route path="/edit-profile" element={<EditProfile />} />
        {/* Route "/wishlist" → Trang danh sách yêu thích */}
        <Route path="/wishlist" element={<WishList />} />
        {/* Route "/booking-history" → Trang lịch sử giao dịch */}
        <Route path="/booking-history" element={<TransactionHistory />} />
        {/* Route "/settings" → Trang cài đặt tài khoản */}
        <Route path="/settings" element={<Settings />} />
        {/* Route "/promotions/hotel" → Trang khuyến mãi khách sạn */}
        <Route path="/promotions/hotel" element={<HotelPromo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
