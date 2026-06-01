// === RoomDetail.jsx - Trang Chi tiết phòng khách sạn ===
// Hiển thị: Gallery ảnh, Tiêu đề & đánh giá, Mô tả, Tiện nghi, Booking card (thẻ đặt phòng)
// Nhận dữ liệu: hotel ID từ URL params, ngày/số khách từ query params

import React, { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../../components/common/Toast';
import { useParams, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  User, Bell, MapPin, Star, Check, Wifi,
  Coffee, Waves, Dumbbell, Car, Utensils,
  ArrowLeft, Snowflake, Square, Heart,
  Maximize, BedDouble, Users, Clock, Info, PawPrint, Ban,
  X, Camera, Plane, Train, Compass, DollarSign, ShoppingCart
} from 'lucide-react';
import { hotelService } from '../../services/hotelService';
import { reviewService } from '../../services/reviewService';

// === Bảng ánh xạ tên tiện nghi → icon tương ứng ===
// Dùng để hiển thị icon phù hợp bên cạnh tên tiện nghi (Hồ bơi, Wifi, Spa...)
const amenityIcons = {
  "Hồ bơi": <Waves className="w-5 h-5 text-gray-600" />,
  "Bể bơi": <Waves className="w-5 h-5 text-gray-600" />,
  "Hồ bơi vô cực": <Waves className="w-5 h-5 text-gray-600" />,
  "Swimming Pool": <Waves className="w-5 h-5 text-gray-600" />,
  "Spa": <Coffee className="w-5 h-5 text-gray-600" />,
  "Dịch vụ spa": <Coffee className="w-5 h-5 text-gray-600" />,
  "Nhà hàng": <Utensils className="w-5 h-5 text-gray-600" />,
  "Phòng ăn": <Utensils className="w-5 h-5 text-gray-600" />,
  "Restaurant": <Utensils className="w-5 h-5 text-gray-600" />,
  "Wifi miễn phí": <Wifi className="w-5 h-5 text-gray-600" />,
  "Free Wi-Fi": <Wifi className="w-5 h-5 text-gray-600" />,
  "Điều hòa": <Snowflake className="w-5 h-5 text-gray-600" />,
  "Air Conditioning": <Snowflake className="w-5 h-5 text-gray-600" />,
  "Chỗ để xe riêng": <span className="font-bold border-2 border-gray-600 w-5 h-5 flex items-center justify-center text-[10px] rounded-sm text-gray-600">P</span>,
  "Đỗ xe": <span className="font-bold border-2 border-gray-600 w-5 h-5 flex items-center justify-center text-[10px] rounded-sm text-gray-600">P</span>,
  "Free Parking": <span className="font-bold border-2 border-gray-600 w-5 h-5 flex items-center justify-center text-[10px] rounded-sm text-gray-600">P</span>,
};

const RoomDetail = () => {
  // Lấy ID khách sạn từ URL (ví dụ: /hotel/hl1 → id = "hl1")
  const { id } = useParams();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  // Lấy query params (được truyền từ trang SearchResults)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, removeToast, toast } = useToast();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [serverReviews, setServerReviews] = useState([]);

  // === Lấy thông tin ngày nhận/trả phòng từ URL ===
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');
  const startDate = startParam && !isNaN(Date.parse(startParam)) ? new Date(startParam) : null;
  const endDate = endParam && !isNaN(Date.parse(endParam)) ? new Date(endParam) : null;

  // Lấy số lượng khách từ URL params
  const adults = parseInt(searchParams.get('adults')) || 2;
  const children = parseInt(searchParams.get('children')) || 0;
  const rooms = parseInt(searchParams.get('rooms')) || 1;

  // === Fetch dữ liệu chi tiết từ Backend ===
  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = {};
        if (startParam) {
          queryParams.check_in = startParam.split('T')[0];
        }
        if (endParam) {
          queryParams.check_out = endParam.split('T')[0];
        }

        const response = await hotelService.getHotelDetail(id, queryParams);
        if (active) {
          const raw = response.data?.data || response.data;

          // Ánh xạ đối tượng Property từ backend sang cấu trúc UI
          // Helper: format time từ ISO date string (backend trả về dạng "1970-01-01T07:00:00.000Z")
          const formatTime = (isoStr) => {
            if (!isoStr) return null;
            try {
              const d = new Date(isoStr);
              const h = String(d.getUTCHours()).padStart(2, '0');
              const m = String(d.getUTCMinutes()).padStart(2, '0');
              return `${h}:${m}`;
            } catch { return null; }
          };

          const safeParseJson = (data) => {
            if (!data) return [];
            if (typeof data === 'object') return data;
            try {
              return JSON.parse(data);
            } catch (e) {
              console.error("Lỗi parse JSON:", e);
              return [];
            }
          };

          // Ánh xạ loại hủy phòng sang tiếng Việt
          const cancellationLabel = {
            free: 'Miễn phí hủy',
            flexible: 'Linh hoạt (miễn phí trước 24h)',
            moderate: 'Vừa phải (miễn phí trước 5 ngày)',
            strict: 'Chặt chẽ (phí 50% trước 7 ngày)',
            non_refundable: 'Không hoàn tiền',
          };

          const policy = raw.policy || null;

          const mapped = {
            id: raw.slug,
            propertyId: raw.id?.toString(),
            name: raw.name,
            slug: raw.slug,
            type: raw.propertyType === 'hotel' || raw.property_type === 'hotel'
              ? 'Khách sạn'
              : raw.propertyType === 'resort' || raw.property_type === 'resort'
                ? 'Resort'
                : raw.propertyType || 'Biệt thự',
            description: raw.description || 'Chưa có mô tả chi tiết.',
            location: `${raw.address || ''}${raw.district ? `, ${raw.district}` : ''}, ${raw.city || ''}`,
            rating: raw.starRating || raw.avgRating || 4,
            reviews: raw.totalReviews || 0,

            // Map danh sách ảnh (property-level media, không có roomTypeId)
            images: raw.media?.filter(m => !m.roomTypeId)?.length > 0
              ? raw.media.filter(m => !m.roomTypeId).map(m => m.url)
              : raw.media?.length > 0
                ? raw.media.map(m => m.url)
                : [
                  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
                  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
                ],
            image: raw.media?.find(m => m.isCover)?.url
              || raw.media?.[0]?.url
              || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',

            // Map danh sách tiện nghi
            amenities: raw.amenities?.length > 0
              ? raw.amenities.map(a => a.amenity?.name).filter(Boolean)
              : ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Restaurant'],

            // Tính toán giá từ các loại phòng (chọn giá thấp nhất)
            price: raw.roomTypes?.length > 0
              ? Math.min(...raw.roomTypes.map(rt => Number(rt.total_price || rt.basePrice || 0)))
              : 850000,

            roomsLeft: raw.roomTypes?.reduce(
              (sum, rt) => sum + (rt.min_available_qty ?? rt.totalRooms ?? 0), 0
            ) || 0,

            // Map danh sách loại phòng - dùng đúng field từ Prisma schema
            roomTypes: raw.roomTypes?.length > 0
              ? raw.roomTypes.map(rt => ({
                id: rt.id?.toString() || String(Math.random()),
                ratePlanId: rt.ratePlans?.[0]?.id?.toString(),
                name: rt.name,
                description: rt.description || '',
                price: Number(rt.total_price || rt.basePrice || 0),
                // areaSqm (Prisma) → area
                area: rt.areaSqm != null ? Number(rt.areaSqm) : (rt.area ?? 30),
                // bedConfiguration (Prisma) → bed
                bed: rt.bedConfiguration || rt.bed_configuration || rt.bed || '1 giường đôi',
                // maxOccupancy (Prisma) → capacity
                capacity: rt.maxOccupancy ?? rt.max_occupancy ?? rt.maxGuests ?? 2,
                // viewType (Prisma)
                viewType: rt.viewType || rt.view_type || null,
                // totalRooms (Prisma)
                totalRooms: rt.totalRooms ?? rt.total_rooms ?? 1,
                // min_available_qty từ availability query
                availableQty: rt.min_available_qty ?? null,
                // Ảnh của từng loại phòng
                images: rt.media?.length > 0 ? rt.media.map(m => m.url) : [],
                // Tiện nghi của từng loại phòng
                amenities: rt.amenities?.length > 0
                  ? rt.amenities.map(a => a.amenity?.name).filter(Boolean)
                  : [],
              }))
              : [
                { id: '1', name: 'Standard Room', price: 850000, area: 25, bed: '1 giường đôi', capacity: 2, viewType: null, totalRooms: 1, availableQty: null, images: [], amenities: [] },
              ],

            // Chính sách lưu trú từ policy
            policy: policy ? {
              checkInFrom: formatTime(policy.checkInFrom) || '14:00',
              checkInUntil: formatTime(policy.checkInUntil) || '22:00',
              checkOutFrom: formatTime(policy.checkOutFrom) || '00:00',
              checkOutUntil: formatTime(policy.checkOutUntil) || '12:00',
              cancellationType: cancellationLabel[policy.cancellationType] || policy.cancellationType || 'Miễn phí hủy',
              freeCancelHours: policy.freeCancelHours || null,
              petsAllowed: policy.petsAllowed ?? false,
              smokingAllowed: policy.smokingAllowed ?? false,
              childrenAllowed: policy.childrenAllowed ?? true,
              breakfastIncluded: policy.breakfastIncluded ?? false,
              parkingType: policy.parkingType || 'none',
              extraBedAvailable: policy.extraBedAvailable ?? false,
              instantConfirmation: policy.instantConfirmation ?? true,
            } : null,

            // Kết nối giao thông từ JSON field (transportConnections)
            transportConnections: safeParseJson(raw.transportConnections),

            // Địa điểm lân cận từ JSON field (nearbyPlaces)
            nearbyPlaces: safeParseJson(raw.nearbyPlaces),

            // Thông tin giờ check-in trực tiếp từ property (nếu không có policy)
            checkInTime: formatTime(raw.checkInTime) || '14:00',
            checkOutTime: formatTime(raw.checkOutTime) || '12:00',
          };

          setHotel(mapped);
          // Không chọn sẵn phòng nào lúc ban đầu
          // setSelectedRoom(mapped.roomTypes[0]);
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết khách sạn từ Backend:", err);
        if (active) {
          setError("Không thể tải chi tiết khách sạn từ server.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchDetail();
    }
    return () => {
      active = false;
    };
  }, [id, startParam, endParam]);

  useEffect(() => {
    let active = true;

    const fetchReviews = async () => {
      if (!hotel?.propertyId) {
        setServerReviews([]);
        return;
      }

      try {
        const response = await reviewService.getByProperty(hotel.propertyId);
        const rawReviews = response.data?.data || response.data || [];
        if (!active) return;

        setServerReviews(rawReviews.map((review) => ({
          id: review.id?.toString(),
          userName: review.customer?.fullName || 'Khách ẩn danh',
          userAvatar: review.customer?.avatarUrl,
          rating: Number(review.overallRating || review.rating || 0),
          date: review.createdAt
            ? new Date(review.createdAt).toLocaleDateString('vi-VN')
            : '',
          comment: review.content || review.comment || '',
          roomName: review.booking?.roomType?.name || 'Phòng đã lưu trú',
          images: [],
        })));
      } catch (err) {
        console.error('Không thể tải đánh giá từ server:', err);
        if (active) {
          setServerReviews([]);
        }
      }
    };

    fetchReviews();
    return () => {
      active = false;
    };
  }, [hotel?.propertyId]);

  // === Tính số đêm lưu trú ===
  // Nếu có ngày hợp lệ → tính chênh lệch, nếu không → mặc định 1 đêm
  const nights = (startDate && endDate && endDate > startDate)
    ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    : 1;

  // Hàm định dạng giá tiền (ví dụ: 2500000 → "2.500.000 ₫")
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
  };

  // Hàm định dạng ngày (ví dụ: Date → "25/04/2026")
  const formatDate = (date) => {
    if (!date) return "Chưa chọn";
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Nếu đang loading hiển thị loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-[#403B69]">
        <div className="w-12 h-12 border-4 border-[#403B69] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold">Đang tải thông tin chi tiết khách sạn từ Backend...</p>
      </div>
    );
  }

  // Nếu có lỗi hoặc không tìm thấy khách sạn tương ứng → hiển thị thông báo lỗi
  if (error || !hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-600 font-semibold p-6 text-center">
        <p className="text-xl mb-4">{error || "Không tìm thấy thông tin khách sạn!"}</p>
        <Link to="/search-results" className="text-[#403B69] hover:underline font-bold">
          Quay lại danh sách tìm kiếm
        </Link>
      </div>
    );
  }

  const reviewsList = serverReviews;
  const totalReviewsCount = reviewsList.length;
  const averageRating = totalReviewsCount > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
    : "4.5";

  // Lấy giá hiện tại (dựa trên phòng đã chọn hoặc mặc định)
  const currentPrice = selectedRoom ? selectedRoom.price : hotel.price;

  // Tính tổng giá = giá/đêm × số đêm × số phòng
  const totalPrice = currentPrice * nights * rooms;

  // Hàm xử lý đặt phòng: Chuyển sang trang thanh toán và truyền dữ liệu qua React Router state
  const handleBooking = () => {
    if (!selectedRoom) {
      toast.warning('Vui lòng chọn một loại phòng trước khi đặt!', 'Chưa chọn phòng');
      return;
    }

    // Kiểm tra đăng nhập trước khi cho phép đặt phòng
    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    navigate('/payment', {
      state: {
        hotel,
        selectedRoom,
        bookingData: {
          startDate,
          endDate,
          adults,
          children,
          nights,
          rooms
        }
      }
    });
  };

  // Hàm xử lý khi người dùng xác nhận muốn đăng nhập từ popup
  const handleConfirmLogin = () => {
    setShowLoginPopup(false);
    navigate('/login', { state: { from: location.pathname + location.search } });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ===== HEADER: Thanh điều hướng trên cùng ===== */}
      <header className="bg-[#e5e5e5] py-4 px-8 md:px-16 flex justify-between items-center shadow-sm relative z-50">
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
              <Link to="/login" className="font-bold text-[#403B69] hover:underline">
                Đăng nhập
              </Link>
              <Link to="/register" className="font-bold text-white bg-[#403B69] px-4 py-2 rounded-lg hover:bg-[#2d2a4a] transition-colors">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {/* 1. Link quay lại trang kết quả tìm kiếm */}
        <div className="flex items-center text-sm text-gray-500 mb-6 font-medium">
          <Link to="/search-results" className="flex items-center hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Destinations
          </Link>
        </div>

        {/* 2. Gallery ảnh: Ảnh chính lớn bên trái (2/3), 2 ảnh nhỏ bên phải (1/3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 h-[300px] md:h-[480px]">
          <div className="md:col-span-2 rounded-l-2xl overflow-hidden h-full">
            <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:flex flex-col gap-2 h-full overflow-hidden">
            <div className="rounded-tr-2xl overflow-hidden h-1/2">
              <img src={hotel.images[1] || hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-br-2xl overflow-hidden h-1/2">
              <img src={hotel.images[2] || hotel.images[0] || hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* 3. Tiêu đề, đánh giá sao, địa điểm, số phòng còn trống */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h1 className="text-4xl font-bold text-[#403B69]">{hotel.name}</h1>
            <button
              onClick={() => toggleWishlist(hotel)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 self-start md:self-auto ${isInWishlist(hotel.id)
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${isInWishlist(hotel.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-500'
                  }`}
              />
              <span>{isInWishlist(hotel.id) ? 'Đã yêu thích' : 'Lưu vào yêu thích'}</span>
            </button>
          </div>
          <div className="flex items-center text-gray-600 text-sm space-x-4 mb-6">
            <div className="flex items-center">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500 mr-1" />
              <span className="font-bold text-black mr-1">{averageRating}</span>
              <span className="text-gray-500">({totalReviewsCount} đánh giá từ khách thật)</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{hotel.location}</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center">
              <Square className="w-4 h-4 mr-1 text-gray-400" />
              <span>Còn trống: {hotel.roomsLeft || 3} phòng</span>
            </div>
          </div>
        </div>

        {/* 4. Separator */}
        <div className="w-full border-t border-gray-200 mb-8"></div>

        {/* 5. Bố cục 2 cột: Mô tả & Tiện nghi (trái) | Thẻ đặt phòng (phải) */}
        <div className="flex flex-col lg:flex-row gap-12 relative">

          {/* === CỘT TRÁI: Các thông tin chi tiết của khách sạn === */}
          <div className="flex-1 space-y-12">

            {/* 1. Tổng quan - dùng selectedRoom nếu đã chọn, ngược lại dùng phòng đầu tiên */}
            {(() => {
              const displayRoom = selectedRoom || hotel.roomTypes[0];
              return (
                <div>
                  <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Tổng quan</h2>
                  {displayRoom && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#f8f9fa] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-[#e8eaf6] rounded-full flex items-center justify-center mb-3 text-[#3F3D7C]">
                          <Maximize className="w-6 h-6" />
                        </div>
                        <div className="text-sm text-gray-500 mb-1">Diện tích</div>
                        <div className="font-bold text-gray-900">
                          {displayRoom.area ? `${displayRoom.area} m²` : 'Liên hệ'}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-[#e8eaf6] rounded-full flex items-center justify-center mb-3 text-[#3F3D7C]">
                          <BedDouble className="w-6 h-6" />
                        </div>
                        <div className="text-sm text-gray-500 mb-1">Loại giường</div>
                        <div className="font-bold text-gray-900 text-sm">
                          {displayRoom.bed || 'Không có thông tin'}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-[#e8eaf6] rounded-full flex items-center justify-center mb-3 text-[#3F3D7C]">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="text-sm text-gray-500 mb-1">Số người</div>
                        <div className="font-bold text-gray-900">
                          Tối đa {displayRoom.capacity || 2}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Hiển thị loại view và tiện nghi phòng nếu có */}
                  {displayRoom?.viewType && (
                    <p className="mt-3 text-sm text-gray-500">
                      🏔️ Hướng nhìn: <span className="font-semibold text-gray-700">{displayRoom.viewType}</span>
                    </p>
                  )}
                  {displayRoom?.amenities?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {displayRoom.amenities.map((a, i) => (
                        <span key={i} className="bg-[#e8eaf6] text-[#3F3D7C] text-xs font-medium px-3 py-1 rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="w-full border-t border-gray-100"></div>

            {/* 2. Mô tả */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Mô tả</h2>
              <div className="bg-[#f8f9fa] rounded-2xl p-6">
                <p className="text-gray-600 text-[15px] leading-relaxed mb-4 whitespace-pre-line">
                  {hotel.description.length > 200 && !isDescExpanded
                    ? hotel.description.substring(0, 200) + '...'
                    : hotel.description}
                </p>
                {hotel.description.length > 200 && (
                  <button
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-[#3F3D7C] font-bold text-sm hover:underline"
                  >
                    {isDescExpanded ? 'Thu gọn' : 'Đọc thêm'}
                  </button>
                )}
              </div>
            </div>

            <div className="w-full border-t border-gray-100"></div>

            {/* 3. Tiện nghi */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Tiện nghi</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8">
                {hotel.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-gray-900 text-[15px]">
                    <span>
                      {amenityIcons[amenity] || <Check className="w-5 h-5 text-gray-600" />}
                    </span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full border-t border-gray-100"></div>
            
            {/* 4. Kết nối giao thông */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Kết nối giao thông</h2>
              {hotel.transportConnections && hotel.transportConnections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f8f9fa] rounded-2xl p-6">
                  {hotel.transportConnections.map((item, idx) => {
                    const name = item.name || item.label || item;
                    const isAirport = /sân bay|airport/i.test(name);
                    const isTrain = /ga tàu|ga |station|metro/i.test(name);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center text-gray-700 min-w-0">
                          <span className="p-2 bg-indigo-50 rounded-lg mr-3 text-[#3F3D7C] shrink-0">
                            {isAirport ? <Plane className="w-4 h-4" /> : isTrain ? <Train className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          </span>
                          <span className="font-medium text-sm truncate">{name}</span>
                        </div>
                        {item.distance && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0 ml-2">
                            {item.distance}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic bg-[#f8f9fa] rounded-2xl p-6">Đang cập nhật thông tin kết nối giao thông</p>
              )}
            </div>

            <div className="w-full border-t border-gray-100"></div>

            {/* 5. Xung quanh chỗ nghỉ */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Xung quanh chỗ nghỉ</h2>
              {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f8f9fa] rounded-2xl p-6">
                  {hotel.nearbyPlaces.map((item, idx) => {
                    const name = item.name || item.label || item;
                    const type = String(item.type || '').toLowerCase();
                    const isFood = type === 'restaurant' || type === 'food' || /nhà hàng|ăn uống|quán ăn/i.test(name);
                    const isCoffee = type === 'cafe' || type === 'coffee' || /cà phê|cafe/i.test(name);
                    const isATM = type === 'atm' || type === 'bank' || /atm|ngân hàng/i.test(name);
                    const isShopping = type === 'supermarket' || type === 'store' || type === 'shop' || /siêu thị|cửa hàng/i.test(name);
                    const isTour = type === 'tourist' || type === 'sightseeing' || type === 'attraction' || /tham quan|du lịch|bảo tàng/i.test(name);
                    
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center text-gray-700 min-w-0">
                          <span className="p-2 bg-indigo-50 rounded-lg mr-3 text-[#3F3D7C] shrink-0">
                            {isFood ? (
                              <Utensils className="w-4 h-4" />
                            ) : isCoffee ? (
                              <Coffee className="w-4 h-4" />
                            ) : isATM ? (
                              <DollarSign className="w-4 h-4" />
                            ) : isShopping ? (
                              <ShoppingCart className="w-4 h-4" />
                            ) : isTour ? (
                              <Compass className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </span>
                          <span className="font-medium text-sm truncate">{name}</span>
                        </div>
                        {item.distance && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0 ml-2">
                            {item.distance}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic bg-[#f8f9fa] rounded-2xl p-6">Đang cập nhật thông tin khu vực xung quanh</p>
              )}
            </div>

            {/* 6. Chính sách lưu trú - từ policy API */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Chính sách lưu trú</h2>
              <div className="bg-[#f8f9fa] rounded-2xl p-6 space-y-5">
                {/* Giờ nhận phòng */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Clock className="w-5 h-5 mr-3" />
                    <span>Nhận phòng</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    Từ {hotel.policy?.checkInFrom || hotel.checkInTime || '14:00'}
                    {hotel.policy?.checkInUntil ? ` – ${hotel.policy.checkInUntil}` : ''}
                  </span>
                </div>
                {/* Giờ trả phòng */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Clock className="w-5 h-5 mr-3" />
                    <span>Trả phòng</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    Trước {hotel.policy?.checkOutUntil || hotel.checkOutTime || '12:00'}
                  </span>
                </div>
                {/* Chính sách hủy */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Info className="w-5 h-5 mr-3" />
                    <span>Hủy phòng</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {hotel.policy?.cancellationType || 'Liên hệ để biết thêm'}
                  </span>
                </div>
                {/* Vật nuôi */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <PawPrint className="w-5 h-5 mr-3" />
                    <span>Vật nuôi</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {hotel.policy != null
                      ? (hotel.policy.petsAllowed ? 'Cho phép mang theo' : 'Không cho phép')
                      : 'Liên hệ để biết thêm'}
                  </span>
                </div>
                {/* Hút thuốc */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Ban className="w-5 h-5 mr-3" />
                    <span>Hút thuốc</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {hotel.policy != null
                      ? (hotel.policy.smokingAllowed ? 'Được phép ở khu quy định' : 'Không hút thuốc')
                      : 'Liên hệ để biết thêm'}
                  </span>
                </div>
                {/* Trẻ em */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Users className="w-5 h-5 mr-3" />
                    <span>Trẻ em</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {hotel.policy != null
                      ? (hotel.policy.childrenAllowed ? 'Chào đón trẻ em' : 'Không cho phép trẻ em')
                      : 'Liên hệ để biết thêm'}
                  </span>
                </div>
                {/* Bữa sáng */}
                {hotel.policy?.breakfastIncluded && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-500">
                      <Info className="w-5 h-5 mr-3" />
                      <span>Bữa sáng</span>
                    </div>
                    <span className="font-bold text-green-600">Đã bao gồm</span>
                  </div>
                )}
                {/* Chỗ đậu xe */}
                {hotel.policy?.parkingType && hotel.policy.parkingType !== 'none' && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-500">
                      <Info className="w-5 h-5 mr-3" />
                      <span>Đậu xe</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      {hotel.policy.parkingType === 'free' ? 'Miễn phí' : 'Có tính phí'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full border-t border-gray-100"></div>

            {/* 7. Các loại phòng trống */}
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif">Các loại phòng trống</h2>
              <div className="space-y-4">
                {hotel.roomTypes.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div
                      key={room.id}
                      className={`bg-[#f8f9fa] rounded-2xl p-6 transition-all duration-200 ${isSelected ? 'border-2 border-[#3F3D7C] shadow-[0_4px_20px_rgba(63,61,124,0.15)] bg-blue-50/30' : 'border border-gray-100 hover:border-gray-300'}`}
                    >
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{room.name}</h3>
                      <div className="flex items-center text-gray-500 text-sm space-x-3 mb-2">
                        <div className="flex items-center"><Maximize className="w-4 h-4 mr-1" /> {room.area} m²</div>
                        <span>•</span>
                        <div className="flex items-center"><BedDouble className="w-4 h-4 mr-1" /> {room.bed}</div>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm mb-6">
                        <Users className="w-4 h-4 mr-1" /> Phù hợp cho {room.capacity} người
                      </div>

                      <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                        <div>
                          <div className="text-[#3F3D7C] text-2xl font-bold">{formatPrice(room.price).replace(" ₫", " đ")}</div>
                          <div className="text-gray-500 text-sm">/ đêm</div>
                        </div>
                        <button
                          onClick={() => setSelectedRoom(isSelected ? null : room)}
                          className={`font-bold py-2.5 px-6 rounded-xl transition-all ${isSelected ? 'bg-white text-[#3F3D7C] border border-[#3F3D7C]' : 'bg-[#3F3D7C] text-white hover:bg-[#34326b]'}`}
                        >
                          {isSelected ? 'Đã chọn' : 'Chọn phòng'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full border-t border-gray-250/60 my-12"></div>
            <HotelReviews reviewsList={reviewsList} averageRating={averageRating} />

          </div>

          {/* === CỘT PHẢI: Thẻ đặt phòng (Booking Card) ===
              Hiển thị: Giá/đêm, Ngày check-in/out, Số khách, Nút đặt phòng
              sticky: cố định khi cuộn trang */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="bg-white p-8 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-gray-200 sticky top-28">
              <div className="mb-8 transition-all duration-300">
                {!selectedRoom && <span className="text-gray-500 text-sm mr-2">Từ</span>}
                <span className="text-3xl font-bold text-gray-900 tracking-tight">VND {currentPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                <span className="text-gray-500 text-sm ml-2">/ đêm</span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden mb-8">
                <div className="flex border-b border-gray-200">
                  <div className="w-1/2 p-5 border-r border-gray-200 bg-white">
                    <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-wider">CHECK-OUT</div>
                    <div className="text-[15px] text-gray-900 font-bold">{startDate ? startDate.toLocaleDateString('en-GB') : "25/04/2026"}</div>
                  </div>
                  <div className="w-1/2 p-5 bg-white">
                    <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-wider">CHECK-IN</div>
                    <div className="text-[15px] text-gray-900 font-bold">{endDate ? endDate.toLocaleDateString('en-GB') : "26/04/2026"}</div>
                  </div>
                </div>
                <div className="p-5 bg-white">
                  <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-wider">GUESTS</div>
                  <div className="text-[15px] text-gray-900 font-bold">{adults + children} người</div>
                </div>
              </div>

              <button
                onClick={handleBooking}
                className={`w-full font-bold text-lg py-5 rounded-2xl shadow-lg transition-all mb-4 ${selectedRoom ? 'bg-[#3F3D7C] text-white hover:bg-[#34326b]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                {selectedRoom ? 'Đặt phòng ngay' : 'Vui lòng chọn phòng'}
              </button>

              <div className="text-center mt-2">
                <p className="text-sm text-gray-500 font-medium">
                  You won't be charged yet
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-white border-t border-gray-100 py-10 mt-16">
        <div className="text-center text-xs text-gray-400 font-medium uppercase tracking-widest">
          © 2026 NOWAYHOME. ĐẶT PHÒNG NHANH, TRẢI NGHIỆM CHẤT.
        </div>
      </footer>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* === POPUP XÁC NHẬN ĐĂNG NHẬP === */}
      {showLoginPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setShowLoginPopup(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '40px 36px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(63, 61, 124, 0.25)',
              animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px',
              }}
            >
              🔐
            </div>

            {/* Tiêu đề */}
            <h3
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#403B69',
                marginBottom: '12px',
                lineHeight: '1.3',
              }}
            >
              Bạn chưa đăng nhập
            </h3>

            {/* Mô tả */}
            <p
              style={{
                fontSize: '15px',
                color: '#6b7280',
                marginBottom: '32px',
                lineHeight: '1.6',
              }}
            >
              Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục đặt phòng và tận hưởng ưu đãi dành riêng cho thành viên!
            </p>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowLoginPopup(false)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '14px',
                  border: '2px solid #e5e7eb',
                  background: 'white',
                  color: '#6b7280',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'white';
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmLogin}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #403B69 0%, #6c63ff 100%)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(64, 59, 105, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(64, 59, 105, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(64, 59, 105, 0.4)';
                }}
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>

          {/* CSS animation */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

// === Component HotelReviews: Hiển thị đánh giá và bình luận từ khách thật ===
const HotelReviews = ({ reviewsList, averageRating }) => {
  const [filterStar, setFilterStar] = React.useState('all');
  const [activeImage, setActiveImage] = React.useState(null);

  const totalReviews = reviewsList.length;

  // Tính số lượng cho từng mức sao
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviewsList.forEach(r => {
    const star = Math.round(r.rating);
    if (starCounts[star] !== undefined) {
      starCounts[star]++;
    }
  });

  const getRatingText = (rating) => {
    const num = parseFloat(rating);
    if (num >= 4.8) return 'Tuyệt hảo';
    if (num >= 4.5) return 'Rất tốt';
    if (num >= 4.0) return 'Tốt';
    if (num >= 3.0) return 'Trung bình';
    return 'Dưới trung bình';
  };

  const displayedReviews = filterStar === 'all'
    ? reviewsList
    : reviewsList.filter(r => Math.round(r.rating) === parseInt(filterStar));

  return (
    <div className="animate-fadeIn">
      <h2 className="text-[22px] font-bold text-gray-900 mb-6 font-serif flex items-center gap-2">
        Đánh giá từ khách thật <span className="text-sm font-normal text-gray-500 font-sans">({totalReviews} bình luận)</span>
      </h2>

      {/* Thẻ thống kê điểm đánh giá */}
      <div className="bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white rounded-3xl p-6 border border-gray-200/50 shadow-sm flex flex-col md:flex-row gap-8 items-center mb-8">
        {/* Điểm trung bình */}
        <div className="text-center md:border-r border-gray-100 md:pr-8 shrink-0 flex flex-col items-center">
          <div className="text-5xl font-black text-[#403B69] mb-2">{averageRating}</div>
          <div className="font-bold text-gray-900 text-base mb-1">{getRatingText(averageRating)}</div>
          <div className="flex gap-0.5 text-amber-500 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < Math.round(parseFloat(averageRating)) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 font-medium">100% đánh giá xác thực từ người lưu trú</div>
        </div>

        {/* Thanh phân bố sao */}
        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starCounts[star] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-gray-500 shrink-0 font-medium text-right">{star} sao</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#403B69] to-[#6c63ff] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-gray-400 shrink-0 font-medium text-left">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bộ lọc số sao */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setFilterStar('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterStar === 'all'
              ? 'bg-[#3F3D7C] border-[#3F3D7C] text-white shadow-md shadow-[#3f3d7c]/20'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
        >
          Tất cả ({totalReviews})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilterStar(star.toString())}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${filterStar === star.toString()
                ? 'bg-[#3F3D7C] border-[#3F3D7C] text-white shadow-md shadow-[#3f3d7c]/20'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {star} <Star className="w-3.5 h-3.5 fill-current" /> ({starCounts[star] || 0})
          </button>
        ))}
      </div>

      {/* Danh sách bình luận */}
      <div className="space-y-6">
        {displayedReviews.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl py-12 text-center text-gray-400">
            Không có đánh giá nào phù hợp với bộ lọc.
          </div>
        ) : (
          displayedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0 space-y-4">
              {/* Thông tin khách hàng & Avatar */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                    <img
                      src={review.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userName}&hair=shortCombover`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-[15px]">{review.userName}</h4>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Đã ở: <span className="text-gray-600 font-semibold">{review.roomName || 'Studio Tiêu Chuẩn'}</span> • Đăng ngày {review.date}
                    </p>
                  </div>
                </div>

                {/* Số sao */}
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-250'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Bình luận */}
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>

              {/* Hàng ảnh chụp thực tế */}
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {review.images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className="w-20 h-20 rounded-xl overflow-hidden cursor-zoom-in border border-gray-100 shadow-sm transition-transform hover:scale-105"
                    >
                      <img src={img} alt="Ảnh thực tế" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Lightbox Modal xem ảnh to */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
            onClick={() => setActiveImage(null)}
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={activeImage}
            alt="Review zoom"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default RoomDetail;
