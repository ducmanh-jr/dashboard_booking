// === SearchResults.jsx - Trang Kết quả tìm kiếm khách sạn ===
// Hiển thị danh sách khách sạn theo bộ lọc (địa điểm, giá, hạng sao)
// Có thanh tìm kiếm lại ở đầu trang, sidebar lọc, và danh sách kết quả
// Dữ liệu lấy từ file mock (hotelsMockData)

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  User, Bell, MapPin, Calendar, Search,
  Star, Map, Filter, ChevronDown, Check, Heart
} from 'lucide-react';
import { hotelService } from '../../services/hotelService';

const SearchResults = () => {
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  // Lấy query parameters từ URL (được truyền từ trang Home khi tìm kiếm)
  const [searchParams, setSearchParams] = useSearchParams();
  // Lấy địa điểm từ URL params
  const locationParam = searchParams.get('location') || '';

  // === Phân tích (parse) ngày từ URL params ===
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');

  const parseSafeDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const parsed = Date.parse(dateStr);
      if (isNaN(parsed)) return null;
      const dateObj = new Date(parsed);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch (e) {
      return null;
    }
  };

  const initialStartDate = parseSafeDate(startParam);
  const initialEndDate = parseSafeDate(endParam);

  // === Phân tích số lượng khách từ URL params (mặc định: 2 người lớn, 0 trẻ em, 1 phòng) ===
  const adultsParam = parseInt(searchParams.get('adults')) || 2;
  const childrenParam = parseInt(searchParams.get('children')) || 0;
  const roomsParam = parseInt(searchParams.get('rooms')) || 1;

  // === State thanh tìm kiếm lại (cho phép người dùng sửa và tìm lại trên trang kết quả) ===
  const [locationInput, setLocationInput] = useState(locationParam);
  const [dateRange, setDateRange] = useState([initialStartDate, initialEndDate]);
  const [startDate, endDate] = dateRange;

  // State cho backend hotels
  const [backendHotels, setBackendHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // === Fetch dữ liệu từ Backend ===
  useEffect(() => {
    let active = true;
    const fetchHotels = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = {
          city: locationParam || undefined,
          rooms_needed: roomsParam || undefined,
        };

        const checkIn = parseSafeDate(startParam);
        const checkOut = parseSafeDate(endParam);

        if (checkIn) {
          queryParams.check_in = checkIn.toISOString().split('T')[0];
        }
        if (checkOut) {
          queryParams.check_out = checkOut.toISOString().split('T')[0];
        }

        const response = await hotelService.searchHotels(queryParams);
        if (active) {
          // Backend wraps response as: { statusCode, message, data: { items: [...], meta: {...} } }
          const data = response.data?.data?.items || response.data?.items || [];
          setBackendHotels(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách khách sạn từ Backend:", err);
        if (active) {
          setError("Không thể kết nối với Backend hoặc tải danh sách khách sạn.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHotels();
    return () => {
      active = false;
    };
  }, [locationParam, startParam, endParam, roomsParam]);

  // State popup chọn số khách
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [guests, setGuests] = useState({ adults: adultsParam, children: childrenParam, rooms: roomsParam });

  // === useEffect: Đồng bộ lại state khi URL thay đổi (ví dụ: khi nhấn nút Back) ===
  useEffect(() => {
    setLocationInput(locationParam);
    // Note: useEffect dependencies can be tricky with object references, so we avoid resetting date unless needed, but for simplicity here:
    setDateRange([initialStartDate, initialEndDate]);
    setGuests({ adults: adultsParam, children: childrenParam, rooms: roomsParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationParam, startParam, endParam, searchParams.get('adults'), searchParams.get('children'), searchParams.get('rooms')]);

  const handleGuestChange = (type, operation) => {
    setGuests(prev => {
      const newValue = operation === 'inc' ? prev[type] + 1 : prev[type] - 1;
      if (newValue < 0) return prev;
      if (type === 'adults' && newValue < 1) return prev; // At least 1 adult
      if (type === 'rooms' && newValue < 1) return prev; // At least 1 room
      return { ...prev, [type]: newValue };
    });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (locationInput) params.append('location', locationInput);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    params.append('adults', guests.adults);
    params.append('children', guests.children);
    params.append('rooms', guests.rooms);

    setSearchParams(params);
  };

  // === State sắp xếp và bộ lọc ===
  // sortBy: Tiêu chí sắp xếp (Độ phổ biến, Khuyến mãi HOT, Giá tăng/giảm)
  const [sortBy, setSortBy] = useState('Độ phổ biến');

  // selectedStars: Lọc theo hạng sao (ví dụ: [3, 4, 5])
  const [selectedStars, setSelectedStars] = useState([]);
  // priceRange: Lọc theo khoảng giá (từ 0 đến 50.000.000)
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);

  // Các state lọc mới
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [beachRange, setBeachRange] = useState([0, 50]);
  const [centerRange, setCenterRange] = useState([0, 50]);
  const [selectedGuestRatings, setSelectedGuestRatings] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedBedTypes, setSelectedBedTypes] = useState([]);

  const sortOptions = ["Độ phổ biến", "Giá từ thấp đến cao", "Giá từ cao đến thấp", "Đánh giá cao nhất"];

  const handleStarToggle = (star) => {
    setSelectedStars(prev =>
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handlePaymentToggle = (payment) => {
    setSelectedPayments(prev => prev.includes(payment) ? prev.filter(p => p !== payment) : [...prev, payment]);
  };
  const handleGuestRatingToggle = (rating) => {
    setSelectedGuestRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
  };
  const handleAreaToggle = (area) => {
    setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };
  const handleBedTypeToggle = (bedType) => {
    setSelectedBedTypes(prev => prev.includes(bedType) ? prev.filter(b => b !== bedType) : [...prev, bedType]);
  };

  // === Hàm loại bỏ dấu tiếng Việt ===
  // Dùng để so sánh tìm kiếm không phân biệt dấu (ví dụ: 'Đà Nẵng' và 'Da Nang' đều khớp)
  const removeDiacritics = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  // === Ánh xạ dữ liệu Backend sang giao diện UI ===
  const mappedHotels = useMemo(() => {
    if (!Array.isArray(backendHotels)) return [];
    return backendHotels.map(h => {
      return {
        id: h.slug, // Dùng slug làm id để chuyển hướng URL đến trang chi tiết chính xác
        name: h.name,
        slug: h.slug,
        type: h.property_type === 'hotel' ? 'Khách sạn' : h.property_type === 'resort' ? 'Resort' : 'Biệt thự',
        image: h.cover_image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        images: [h.cover_image].filter(Boolean),
        rating: h.star_rating || 4,
        location: `${h.address || ''}${h.district ? `, ${h.district}` : ''}, ${h.city || ''}`,
        reviews: h.total_reviews || 0,
        price: h.min_nightly_price || 0,
        originalPrice: h.min_nightly_price ? Math.round(h.min_nightly_price * 1.25) : 0,

        // Các trường lọc mở rộng (an toàn fallback từ district/seed dữ liệu)
        amenities: ["Wifi miễn phí", "Điều hòa", "Nhà hàng", "Hồ bơi"],
        paymentOptions: ["Hủy miễn phí", "Thanh toán tại nơi ở", "Đặt trước trả tiền sau"],
        distanceToBeach: Math.floor(Math.random() * 5) + 1,
        distanceToCenter: Math.floor(Math.random() * 10) + 1,
        guestRating: h.avg_rating || 8.5,
        area: h.district || h.city || "Khác",
        bedTypes: ["Giường đôi lớn", "Hai giường đơn"],
        roomsLeft: 5
      };
    });
  }, [backendHotels]);

  // === useMemo: Lọc và sắp xếp danh sách khách sạn ===
  // Tự động tính toán lại khi các bộ lọc thay đổi (selectedStars, priceRange, sortBy, locationParam)
  const filteredAndSortedHotels = useMemo(() => {
    let result = [...mappedHotels];

    // Lọc theo địa điểm
    if (locationParam) {
      const searchStr = removeDiacritics(locationParam);
      result = result.filter(hotel =>
        removeDiacritics(hotel.location).includes(searchStr) ||
        removeDiacritics(hotel.name).includes(searchStr)
      );
    }

    // Lọc theo sao
    if (selectedStars.length > 0) {
      result = result.filter(hotel => selectedStars.includes(hotel.rating));
    }

    // Lọc theo giá
    result = result.filter(hotel => hotel.price >= priceRange[0] && hotel.price <= priceRange[1]);

    // Lọc theo tiện ích (amenities)
    if (selectedAmenities.length > 0) {
      result = result.filter(hotel => {
        return selectedAmenities.every(amenity => {
          const lowerAmenity = amenity.toLowerCase();
          return hotel.amenities.some(ha => {
            const lowerHa = ha.toLowerCase();
            if (lowerAmenity === 'pool') return lowerHa.includes('hồ bơi') || lowerHa.includes('bể bơi');
            if (lowerAmenity === 'free wifi') return lowerHa.includes('wifi');
            if (lowerAmenity === 'spa') return lowerHa.includes('spa');
            return lowerHa.includes(lowerAmenity);
          });
        });
      });
    }

    // Lọc theo loại hình (type)
    if (selectedTypes.length > 0) {
      result = result.filter(hotel => {
        return selectedTypes.some(type => {
          if (type === 'Khách sạn' && hotel.type === 'Khách sạn') return true;
          if (type === 'Villa' && hotel.type === 'Resort') return true;
          return hotel.type.toLowerCase() === type.toLowerCase();
        });
      });
    }

    // Lọc theo lựa chọn thanh toán
    if (selectedPayments.length > 0) {
      result = result.filter(hotel =>
        hotel.paymentOptions && selectedPayments.every(payment => hotel.paymentOptions.includes(payment))
      );
    }

    // Lọc theo khoảng cách biển
    result = result.filter(hotel =>
      hotel.distanceToBeach !== undefined ? (hotel.distanceToBeach >= beachRange[0] && hotel.distanceToBeach <= beachRange[1]) : true
    );

    // Lọc theo khoảng cách trung tâm
    result = result.filter(hotel =>
      hotel.distanceToCenter !== undefined ? (hotel.distanceToCenter >= centerRange[0] && hotel.distanceToCenter <= centerRange[1]) : true
    );

    // Lọc theo đánh giá của khách
    if (selectedGuestRatings.length > 0) {
      const minRequired = Math.min(...selectedGuestRatings);
      result = result.filter(hotel => hotel.guestRating && hotel.guestRating >= minRequired);
    }

    // Lọc theo khu vực
    if (selectedAreas.length > 0) {
      result = result.filter(hotel => hotel.area && selectedAreas.includes(hotel.area));
    }

    // Lọc theo loại giường
    if (selectedBedTypes.length > 0) {
      result = result.filter(hotel =>
        hotel.bedTypes && selectedBedTypes.some(bedType => hotel.bedTypes.includes(bedType))
      );
    }

    // Sắp xếp
    switch (sortBy) {
      case "Giá từ thấp đến cao":
        result.sort((a, b) => a.price - b.price);
        break;
      case "Giá từ cao đến thấp":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Đánh giá sao nhất":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "Độ phổ biến":
      default:
        // Sắp xếp theo số lượng đánh giá giảm dần
        result.sort((a, b) => b.reviews - a.reviews);
        break;
    }

    return result;
  }, [mappedHotels, selectedStars, priceRange, selectedAmenities, selectedTypes, selectedPayments, beachRange, centerRange, selectedGuestRatings, selectedAreas, selectedBedTypes, sortBy, locationParam]);

  // Hàm định dạng giá tiền (ví dụ: 1500000 → "1.500.000 ₫")
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900">
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

      {/* ===== THANH TÌM KIỎM LẠI: Nền tím, chứa ô địa điểm, lịch chọn ngày, số khách, nút tìm ===== */}
      <div className="bg-[#403B69] py-6 px-8 md:px-16 shadow-md">
        <div className="max-w-[1200px] mx-auto bg-white rounded-xl shadow-lg p-2 flex flex-col md:flex-row gap-2 items-center">

          <div className="flex-1 w-full p-2 flex items-center bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-500 mr-2" />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Bạn muốn đi đâu"
              className="text-sm font-medium text-gray-800 outline-none w-full bg-transparent"
            />
          </div>

          <div className="flex-1 w-full p-2 flex items-center bg-gray-50 rounded-lg relative cursor-pointer">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <div className="flex-1">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                placeholderText="Nhận phòng - Trả phòng"
                className="text-sm font-medium text-gray-800 outline-none w-full bg-transparent cursor-pointer"
                dateFormat="dd/MM/yyyy"
                minDate={new Date()}
              />
            </div>
          </div>

          <div
            className="flex-1 w-full p-2 flex items-center bg-gray-50 rounded-lg relative cursor-pointer"
            onClick={() => setShowGuestPopover(!showGuestPopover)}
          >
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-800 flex-1">{guests.adults} người lớn, {guests.children} trẻ em, {guests.rooms} phòng</span>

            {/* Guest Popover */}
            {showGuestPopover && (
              <div className="absolute top-[calc(100%+12px)] left-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 cursor-default" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="font-bold text-gray-800">Người lớn</div>
                    <div className="text-xs text-gray-500">Từ 13 tuổi trở lên</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => handleGuestChange('adults', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.adults <= 1}>-</button>
                    <span className="w-4 text-center font-medium">{guests.adults}</span>
                    <button onClick={() => handleGuestChange('adults', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="font-bold text-gray-800">Trẻ em</div>
                    <div className="text-xs text-gray-500">Dưới 13 tuổi</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => handleGuestChange('children', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.children <= 0}>-</button>
                    <span className="w-4 text-center font-medium">{guests.children}</span>
                    <button onClick={() => handleGuestChange('children', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800">Phòng</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => handleGuestChange('rooms', 'dec')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={guests.rooms <= 1}>-</button>
                    <span className="w-4 text-center font-medium">{guests.rooms}</span>
                    <button onClick={() => handleGuestChange('rooms', 'inc')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-800 transition-colors">+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSearch} className="px-8 py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors">
            Tìm kiếm
          </button>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">

        {/* ===== SIDEBAR TRÁI: BỘ LỌc TÌM KIỎM =====
            - Lọc theo mức giá: Dưới 1 triệu, 1-2 triệu, Trên 2 triệu
            - Lọc theo hạng sao: 3, 4, 5 sao */}
        <aside className="w-full md:w-1/4 flex-shrink-0">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-100">
              <Filter className="w-5 h-5 text-[#403B69]" />
              <h2 className="font-bold text-lg text-gray-900">Bộ lọc tìm kiếm</h2>
            </div>

            {/* Giá phòng */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Mức giá (1 đêm)</h3>
              <div className="space-y-4">
                <div className="relative h-6 flex items-center">
                  <div className="absolute w-full h-1 bg-gray-200 rounded-full"></div>
                  <div
                    className="absolute h-1 bg-[#403B69] rounded-full"
                    style={{
                      left: `${(priceRange[0] / 50000000) * 100}%`,
                      right: `${100 - (priceRange[1] / 50000000) * 100}%`
                    }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="50000000"
                    step="100000"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const value = Math.min(Number(e.target.value), priceRange[1] - 500000);
                      setPriceRange([value, priceRange[1]]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <input
                    type="range"
                    min="0"
                    max="50000000"
                    step="100000"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const value = Math.max(Number(e.target.value), priceRange[0] + 500000);
                      setPriceRange([priceRange[0], value]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span className="text-[#403B69] font-bold">{formatPrice(priceRange[0])}</span>
                  <span className="text-[#403B69] font-bold">{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </div>

            {/* Hạng sao */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Hạng sao</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(star => (
                  <label key={star} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedStars.includes(star) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedStars.includes(star) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedStars.includes(star)} onChange={() => handleStarToggle(star)} />
                    <div className="flex items-center space-x-1">
                      {[...Array(star)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tiện ích */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Tiện ích</h3>
              <div className="space-y-3">
                {['Pool', 'Free WiFi', 'Breakfast Included', 'Spa'].map(amenity => (
                  <label key={amenity} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedAmenities.includes(amenity) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedAmenities.includes(amenity) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedAmenities.includes(amenity)} onChange={() => handleAmenityToggle(amenity)} />
                    <span className="text-sm text-gray-700 font-medium">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Loại hình */}
            <div className="mb-2">
              <h3 className="font-bold text-gray-800 mb-4">Loại hình</h3>
              <div className="space-y-3">
                {['Khách sạn', 'Nhà nghỉ', 'Căn hộ', 'Villa', 'Homestay', 'Bungalow', 'Camping'].map(type => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.includes(type) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedTypes.includes(type) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedTypes.includes(type)} onChange={() => handleTypeToggle(type)} />
                    <span className="text-sm text-gray-700 font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Lựa chọn thanh toán */}
            <div className="mb-6 pb-6 border-b border-gray-100 mt-6">
              <h3 className="font-bold text-gray-800 mb-4">Lựa chọn thanh toán</h3>
              <div className="space-y-3">
                {['Hủy miễn phí', 'Thanh toán tại nơi ở', 'Đặt trước trả tiền sau', 'Thanh toán ngay', 'Không cần thẻ tín dụng'].map(payment => (
                  <label key={payment} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPayments.includes(payment) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedPayments.includes(payment) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedPayments.includes(payment)} onChange={() => handlePaymentToggle(payment)} />
                    <span className="text-sm text-gray-700 font-medium">{payment}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Khoảng cách đến bãi biển */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Khoảng cách đến bãi biển</h3>
              <div className="space-y-4">
                <div className="relative h-6 flex items-center">
                  <div className="absolute w-full h-1 bg-gray-200 rounded-full"></div>
                  <div
                    className="absolute h-1 bg-[#403B69] rounded-full"
                    style={{
                      left: `${(beachRange[0] / 50) * 100}%`,
                      right: `${100 - (beachRange[1] / 50) * 100}%`
                    }}
                  ></div>
                  <input
                    type="range" min="0" max="50" step="1" value={beachRange[0]}
                    onChange={(e) => {
                      const value = Math.min(Number(e.target.value), beachRange[1] - 1);
                      setBeachRange([value, beachRange[1]]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <input
                    type="range" min="0" max="50" step="1" value={beachRange[1]}
                    onChange={(e) => {
                      const value = Math.max(Number(e.target.value), beachRange[0] + 1);
                      setBeachRange([beachRange[0], value]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span className="text-[#403B69] font-bold">{beachRange[0]} km</span>
                  <span className="text-[#403B69] font-bold">{beachRange[1]} km</span>
                </div>
              </div>
            </div>

            {/* Khoảng cách đến trung tâm */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Khoảng cách đến trung tâm</h3>
              <div className="space-y-4">
                <div className="relative h-6 flex items-center">
                  <div className="absolute w-full h-1 bg-gray-200 rounded-full"></div>
                  <div
                    className="absolute h-1 bg-[#403B69] rounded-full"
                    style={{
                      left: `${(centerRange[0] / 50) * 100}%`,
                      right: `${100 - (centerRange[1] / 50) * 100}%`
                    }}
                  ></div>
                  <input
                    type="range" min="0" max="50" step="1" value={centerRange[0]}
                    onChange={(e) => {
                      const value = Math.min(Number(e.target.value), centerRange[1] - 1);
                      setCenterRange([value, centerRange[1]]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <input
                    type="range" min="0" max="50" step="1" value={centerRange[1]}
                    onChange={(e) => {
                      const value = Math.max(Number(e.target.value), centerRange[0] + 1);
                      setCenterRange([centerRange[0], value]);
                    }}
                    className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#403B69] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span className="text-[#403B69] font-bold">{centerRange[0]} km</span>
                  <span className="text-[#403B69] font-bold">{centerRange[1]} km</span>
                </div>
              </div>
            </div>

            {/* Đánh giá của khách */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Đánh giá của khách</h3>
              <div className="space-y-3">
                {[
                  { val: 9, label: '9+ Trên cả tuyệt vời' },
                  { val: 8, label: '8+ Xuất sắc' },
                  { val: 7, label: '7+ Rất tốt' },
                  { val: 6, label: '6+ Hài lòng' },
                  { val: 5, label: '5+ Bình thường' }
                ].map(rating => (
                  <label key={rating.val} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedGuestRatings.includes(rating.val) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedGuestRatings.includes(rating.val) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedGuestRatings.includes(rating.val)} onChange={() => handleGuestRatingToggle(rating.val)} />
                    <span className="text-sm text-gray-700 font-medium">{rating.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Khu vực */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Khu vực</h3>
              <div className="space-y-3">
                {Array.from(new Set(mappedHotels.map(h => h.area))).filter(Boolean).map(area => (
                  <label key={area} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedAreas.includes(area) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedAreas.includes(area) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedAreas.includes(area)} onChange={() => handleAreaToggle(area)} />
                    <span className="text-sm text-gray-700 font-medium">{area}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Loại giường */}
            <div className="mb-2">
              <h3 className="font-bold text-gray-800 mb-4">Loại giường</h3>
              <div className="space-y-3">
                {['Giường đôi lớn', 'Giường đơn lớn', 'Hai giường đơn', 'Giường tầng', 'Giường đơn 1 người'].map(bedType => (
                  <label key={bedType} className="flex items-center space-x-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBedTypes.includes(bedType) ? 'bg-[#403B69] border-[#403B69]' : 'border-gray-300 group-hover:border-[#403B69]'}`}>
                      {selectedBedTypes.includes(bedType) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedBedTypes.includes(bedType)} onChange={() => handleBedTypeToggle(bedType)} />
                    <span className="text-sm text-gray-700 font-medium">{bedType}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full mt-6 py-3 bg-[#403B69] text-white font-bold rounded-lg hover:bg-[#2d2a4a] transition-colors shadow-sm">
              Apply Filters
            </button>
            <button
              onClick={() => {
                setSelectedStars([]); setPriceRange([0, 50000000]); setSelectedAmenities([]); setSelectedTypes([]);
                setSelectedPayments([]); setBeachRange([0, 50]); setCenterRange([0, 50]);
                setSelectedGuestRatings([]); setSelectedAreas([]); setSelectedBedTypes([]);
              }}
              className="w-full mt-3 py-2 text-[#403B69] font-bold hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        </aside>

        {/* ===== CỘT PHẢI: DANH SÁCH KẾT QUẢ KHÁCH SẠN ===== */}
        <div className="flex-1">

          {/* --- Thanh sắp xếp: Hiển thị số kết quả + các nút sắp xếp --- */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-center justify-between">
            <h1 className="font-bold text-xl text-gray-800 mb-4 md:mb-0">
              Tìm thấy <span className="text-orange-500">{filteredAndSortedHotels.length}</span> chỗ nghỉ
            </h1>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 font-medium mr-2">Sắp xếp theo:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {sortOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${sortBy === option ? 'bg-white text-[#403B69] shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* --- Danh sách các thẻ khách sạn ---
              Mỗi thẻ gồm: Ảnh, Tên, Địa điểm, Đánh giá, Tiện ích, Giá, Nút chọn phòng
              Click vào thẻ → chuyển đến trang chi tiết /hotel/:id */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white p-12 rounded-xl border border-gray-200 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#403B69] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Đang tìm kiếm khách sạn phù hợp từ Backend...</p>
              </div>
            ) : error ? (
              <div className="bg-white p-12 rounded-xl border border-red-200 text-center text-red-600 font-semibold shadow-sm">
                {error}
              </div>
            ) : filteredAndSortedHotels.length > 0 ? (
              filteredAndSortedHotels.map(hotel => (
                <Link to={`/hotel/${hotel.id}?${searchParams.toString()}`} key={hotel.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow block">
                  {/* Image */}
                  <div className="w-full md:w-[280px] h-60 md:h-auto relative flex-shrink-0">
                    <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />

                    {/* Heart Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(hotel);
                      }}
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm w-9 h-9 rounded-full flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-md z-10"
                      aria-label="Thêm vào yêu thích"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-300 ${isInWishlist(hotel.id)
                          ? 'text-red-500 fill-red-500 scale-110'
                          : 'text-gray-600 hover:text-red-500'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">{hotel.type}</span>
                          <div className="flex">
                            {[...Array(Math.floor(Number(hotel.rating || 4)))].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2 hover:text-[#403B69] cursor-pointer transition-colors">{hotel.name}</h2>
                        <div className="flex items-center text-gray-500 text-sm mb-4">
                          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate max-w-[200px] md:max-w-xs">{hotel.location}</span>
                          <button className="text-blue-600 font-medium ml-2 hover:underline flex-shrink-0">Xem bản đồ</button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end text-right ml-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-600 hidden md:inline">{hotel.reviews} đánh giá</span>
                          <div className="bg-[#403B69] text-white font-bold w-8 h-8 rounded flex items-center justify-center">
                            9.0
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium hidden md:block">Tuyệt vời</span>
                      </div>
                    </div>

                    <div className="flex-1 hidden md:block">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {hotel.amenities.map((amenity, idx) => (
                          <span key={idx} className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium border border-gray-200">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-auto">
                      <div className="text-green-600 text-sm font-medium flex items-center">
                        <Check className="w-4 h-4 mr-1" /> <span className="hidden md:inline">Miễn phí hủy phòng</span><span className="md:hidden">Hủy miễn phí</span>
                      </div>
                      <div className="text-right">
                        {hotel.originalPrice > hotel.price && (
                          <div className="text-sm text-gray-400 line-through mb-0.5">
                            {formatPrice(hotel.originalPrice)}
                          </div>
                        )}
                        <div className="text-2xl font-bold text-orange-500 mb-2">
                          {formatPrice(hotel.price)}
                        </div>
                        <button className="bg-orange-500 text-white font-bold px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm w-full md:w-auto text-sm md:text-base">
                          Chọn phòng
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy chỗ nghỉ phù hợp</h3>
                <p className="text-gray-500">Vui lòng thay đổi bộ lọc hoặc tiêu chí tìm kiếm để xem thêm kết quả.</p>
                <button
                  onClick={() => {
                    setSelectedStars([]); setPriceRange([0, 50000000]); setSelectedAmenities([]); setSelectedTypes([]);
                    setSelectedPayments([]); setBeachRange([0, 50]); setCenterRange([0, 50]);
                    setSelectedGuestRatings([]); setSelectedAreas([]); setSelectedBedTypes([]);
                  }}
                  className="mt-6 text-[#403B69] font-bold hover:underline"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default SearchResults;
