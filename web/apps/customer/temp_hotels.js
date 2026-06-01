// === hotels.js - Dữ liệu giả lập (mock data) các khách sạn ===
// Chứa danh sách 21 khách sạn: 11 ở Hạ Long + 10 ở Đà Nẵng
// Mỗi khách sạn gồm: id, name, rating (sao), reviews, location, price, originalPrice,
//   tag (nhãn khuyến mãi), image (thumbnail), images (gallery), description, amenities, type
// Dữ liệu này được sử dụng bởi: SearchResults, RoomDetail, Payment

module.exports.hotelsMockData = [
  // 10 Khách sạn ở Hạ Long
  {
    id: "hl1",
    name: "Vinpearl Resort & Spa Hạ Long",
    rating: 5,
    reviews: 1245,
    location: "Đảo Rều, Bãi Cháy, Hạ Long",
    price: 2500000,
    originalPrice: 3200000,
    tag: "Khuyến mãi HOT",
    image: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop"
    ],
    description: "Vinpearl Resort & Spa Hạ Long mang đến trải nghiệm nghỉ dưỡng sang trọng bậc nhất với tầm nhìn toàn cảnh vịnh Hạ Long tuyệt đẹp. Nằm tách biệt trên Đảo Rều, khu nghỉ dưỡng sở hữu không gian yên bình, bãi biển riêng tư, cùng hệ thống phòng ốc đẳng cấp quốc tế. Quý khách có thể tận hưởng các dịch vụ spa trị liệu cao cấp, hồ bơi ngoài trời vô cực và đa dạng ẩm thực tại các nhà hàng đạt sao Michelin.",
    amenities: ["Hồ bơi vô cực", "Spa trị liệu", "Nhà hàng cao cấp", "Bãi biển riêng", "Wifi tốc độ cao", "Phòng Gym", "Đưa đón sân bay", "Dịch vụ phòng 24/7"],
    type: "Resort"
  },
  {
    id: "hl2",
    name: "Muong Thanh Luxury Quang Ninh",
    rating: 5,
    reviews: 890,
    location: "Khu 2, Bãi Cháy, Hạ Long",
    price: 1800000,
    originalPrice: 2200000,
    tag: "Độ phổ biến",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop"
    ],
    description: "Tọa lạc ngay trung tâm khu du lịch Bãi Cháy, Mường Thanh Luxury Quảng Ninh là điểm dừng chân lý tưởng để khám phá di sản thiên nhiên thế giới. Khách sạn cung cấp hệ thống phòng nghỉ sang trọng, đầy đủ tiện nghi với view ngắm nhìn trọn vẹn cầu Bãi Cháy. Khách lưu trú có thể thư giãn tại hồ bơi, thưởng thức ẩm thực Việt Nam và quốc tế tại hệ thống nhà hàng hiện đại.",
    amenities: ["Hồ bơi", "Phòng gym", "Nhà hàng", "Wifi miễn phí", "Khu vui chơi trẻ em", "Dịch vụ giặt ủi", "Quầy bar", "Bảo vệ 24/24"],
    type: "Khách sạn"
  },
  {
    id: "hl3",
    name: "Wyndham Legend Halong",
    rating: 5,
    reviews: 1560,
    location: "12 Hạ Long, Bãi Cháy, Hạ Long",
    price: 2100000,
    originalPrice: 2800000,
    tag: "View đẹp",
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516815231560-8f41ec531527?q=80&w=1467&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop"
    ],
    description: "Khách sạn quốc tế 5 sao với thiết kế đương đại cùng điểm nhấn là khung cảnh Vịnh Hạ Long ngoạn mục nhìn từ cửa sổ phòng. Wyndham Legend Halong cam kết mang đến những tiêu chuẩn nghỉ dưỡng đẳng cấp toàn cầu. Dịch vụ ẩm thực phong phú, hồ bơi lớn cùng đội ngũ nhân viên nhiệt tình sẽ làm kỳ nghỉ của bạn trở nên đáng nhớ.",
    amenities: ["Hồ bơi vô cực", "Nhà hàng cao cấp", "Sky Bar", "Wifi miễn phí", "Phòng xông hơi", "Dịch vụ phòng", "Đưa đón tận nơi"],
    type: "Khách sạn"
  },
  {
    id: "hl4",
    name: "Novotel Ha Long Bay",
    rating: 4,
    reviews: 1120,
    location: "160 Hạ Long, Bãi Cháy, Hạ Long",
    price: 1600000,
    originalPrice: 1900000,
    tag: "Độ phổ biến",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop"
    ],
    description: "Sở hữu vị trí vàng ngay khu vực Bãi Cháy, Novotel Ha Long Bay mang đến không gian lưu trú trẻ trung, hiện đại và vô cùng tiện lợi. Cách công viên Sun World chỉ vài bước chân. Khuôn viên khách sạn rộng rãi, hồ bơi ngoài trời cùng khu vực nướng BBQ rất phù hợp cho kỳ nghỉ của gia đình.",
    amenities: ["Hồ bơi ngoài trời", "Spa", "Wifi miễn phí", "Sân hiên phơi nắng", "Nhà hàng", "Quán Cafe"],
    type: "Khách sạn"
  },
  {
    id: "hl5",
    name: "Halong Plaza Hotel",
    rating: 4,
    reviews: 750,
    location: "8 Hạ Long, Bãi Cháy, Hạ Long",
    price: 1300000,
    originalPrice: 1600000,
    tag: "Giá tốt",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop"
    ],
    description: "Halong Plaza Hotel là một trong những khách sạn lâu đời và uy tín nhất tại Hạ Long. Dù giữ được nét cổ điển, các phòng nghỉ tại đây luôn được nâng cấp để đáp ứng tiêu chuẩn quốc tế. Khách sạn nổi tiếng với bữa sáng buffet đa dạng các món ăn Á-Âu.",
    amenities: ["Nhà hàng", "Wifi miễn phí", "Đỗ xe", "Phòng họp", "Dịch vụ giặt ủi", "Lễ tân 24h"],
    type: "Khách sạn"
  },
  {
    id: "hl6",
    name: "Sai Gon Halong Hotel",
    rating: 4,
    reviews: 640,
    location: "168 Hạ Long, Bãi Cháy, Hạ Long",
    price: 1100000,
    originalPrice: 1400000,
    tag: "Độ phổ biến",
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop"
    ],
    description: "Nằm nép mình bên đồi thông xanh ngát hướng ra biển, Sài Gòn Hạ Long Hotel mang lại cảm giác nghỉ dưỡng trong lành. Phòng ốc trang nhã, ban công rộng rãi để đón bình minh trên vịnh.",
    amenities: ["Hồ bơi", "Wifi miễn phí", "Sân Tennis", "Nhà hàng", "Phòng tập thể dục"],
    type: "Khách sạn"
  },
  {
    id: "hl7",
    name: "Royal Halong Hotel",
    rating: 5,
    reviews: 530,
    location: "Bãi Cháy, Hạ Long",
    price: 1900000,
    originalPrice: 2500000,
    tag: "Khuyến mãi HOT",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1561501900-3701fa6a0864?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1682913629540-3857602b540c?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Royal Halong Hotel cung cấp dịch vụ nghỉ dưỡng hoàng gia với hệ thống phòng ốc trang trí lộng lẫy. Đặc biệt, khách sạn còn có khu vực giải trí cao cấp, hồ bơi bốn mùa trong nhà, và nhiều tiện ích giải trí độc đáo khác.",
    amenities: ["Hồ bơi 4 mùa", "Khu giải trí", "Nhà hàng sang trọng", "Wifi miễn phí", "Phòng xông hơi"],
    type: "Khách sạn"
  },
  {
    id: "hl8",
    name: "D'Lecia Ha Long Hotel",
    rating: 3,
    reviews: 320,
    location: "Đông Hùng Thắng, Bãi Cháy, Hạ Long",
    price: 800000,
    originalPrice: 1000000,
    tag: "Giá rẻ",
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1648706319922-5b884abb264d?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1594099462046-1df31fd4a66c?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "D'Lecia là lựa chọn tuyệt vời cho du khách yêu thích thiết kế Boutique ấm cúng. Nằm cách khu trung tâm chỉ vài phút đi bộ, khách sạn mang lại sự thuận tiện di chuyển mà giá cả vô cùng hợp lý.",
    amenities: ["Wifi miễn phí", "Nhà hàng", "Cho thuê xe máy", "Dịch vụ tour", "Lễ tân 24h"],
    type: "Khách sạn"
  },
  {
    id: "hl9",
    name: "Tuan Chau Island Holiday Villa",
    rating: 4,
    reviews: 890,
    location: "Đảo Tuần Châu, Hạ Long",
    price: 2200000,
    originalPrice: 2800000,
    tag: "Nghỉ dưỡng",
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop"
    ],
    description: "Khu biệt thự nghỉ dưỡng nằm tại Đảo Tuần Châu xinh đẹp. Mỗi căn villa đều có sân vườn riêng biệt, không gian tĩnh lặng, cực kỳ thích hợp cho các chuyến đi thư giãn của gia đình hoặc nhóm bạn.",
    amenities: ["Gần biển", "Hồ bơi riêng", "Spa", "Nhà bếp", "Khu BBQ ngoài trời", "An ninh 24/7"],
    type: "Resort"
  },
  {
    id: "hl10",
    name: "Paradise Suites Hotel",
    rating: 4,
    reviews: 1050,
    location: "Đảo Tuần Châu, Hạ Long",
    price: 1700000,
    originalPrice: 2100000,
    tag: "Sang trọng",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop"
    ],
    description: "Một tuyệt tác khách sạn boutique tọa lạc ngay tại cửa ngõ vịnh Hạ Long. Paradise Suites mang phong cách thiết kế mộc mạc nhưng thanh lịch. Khách sạn cung cấp nhiều gói combo nghỉ dưỡng kết hợp du thuyền cao cấp.",
    amenities: ["Nhà hàng", "Wifi miễn phí", "Đưa đón sân bay", "Dịch vụ tour du thuyền", "Phòng chờ VIP"],
    type: "Khách sạn"
  },

  // ===== 10 Khách sạn ở Đà Nẵng =====
  {
    id: "dn1",
    name: "InterContinental Danang Sun Peninsula Resort",
    rating: 5,
    reviews: 2100,
    location: "Bãi Bắc, Bán Đảo Sơn Trà, Đà Nẵng",
    price: 9500000,
    originalPrice: 12000000,
    tag: "Sang trọng",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop",
      "https://plus.unsplash.com/premium_photo-1678240508014-d1ab7345bfe6?q=80&w=1642&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Kiệt tác nghỉ dưỡng được thiết kế bởi kiến trúc sư lừng danh Bill Bensley. Khu nghỉ dưỡng trải dài trên các sườn đồi của bán đảo Sơn Trà hoang sơ. Du khách sẽ được hòa mình vào thiên nhiên, chiêm ngưỡng loài vọc chà vá chân nâu quý hiếm và tận hưởng dịch vụ hoàng gia.",
    amenities: ["Bãi biển riêng", "Hồ bơi vô cực", "Nhà hàng Pháp La Maison 1888", "Harnn Heritage Spa", "Phòng chiếu phim", "Club trẻ em"],
    type: "Resort"
  },
  {
    id: "dn2",
    name: "Furama Resort Danang",
    rating: 5,
    reviews: 1800,
    location: "Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng",
    price: 4500000,
    originalPrice: 5500000,
    tag: "Khuyến mãi HOT",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop"
    ],
    description: "Khu nghỉ dưỡng 5 sao sang trọng nằm dọc theo bãi biển Bắc Mỹ An vô cùng quyến rũ. Các phòng nghỉ mang đậm kiến trúc truyền thống Việt Nam kết hợp phong cách thuộc địa Pháp.",
    amenities: ["Bãi biển riêng", "Hồ bơi lagoon lớn", "Spa", "Khu thể thao dưới nước", "Nhà hàng hải sản", "Casino"],
    type: "Resort"
  },
  {
    id: "dn3",
    name: "Novotel Danang Premier Han River",
    rating: 5,
    reviews: 1600,
    location: "36 Bạch Đằng, Hải Châu, Đà Nẵng",
    price: 2300000,
    originalPrice: 2900000,
    tag: "Độ phổ biến",
    image: "https://images.unsplash.com/photo-1689729739836-7fcc2c84d788?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    images: [
      "https://images.unsplash.com/photo-1689729739836-7fcc2c84d788?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1660839638332-93ea03e0f865?q=80&w=1436&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Tọa lạc tại vị trí đắc địa nhất đường Bạch Đằng, Novotel Danang Premier Han River nổi bật với thiết kế chọc trời hiện đại, view ôm trọn sông Hàn thơ mộng.",
    amenities: ["View sông Hàn", "Sky bar cao nhất", "Hồ bơi vô cực", "Nhà hàng quốc tế", "Dịch vụ đưa đón"],
    type: "Khách sạn"
  },
  {
    id: "dn4",
    name: "Muong Thanh Luxury Da Nang",
    rating: 5,
    reviews: 1400,
    location: "270 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng",
    price: 1800000,
    originalPrice: 2300000,
    tag: "Giá tốt",
    image: "https://plus.unsplash.com/premium_photo-1681922761648-d5e2c3972982?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    images: [
      "https://plus.unsplash.com/premium_photo-1681922761648-d5e2c3972982?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1689729739836-7fcc2c84d788?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Ngay sát bãi biển Mỹ Khê – một trong những bãi biển đẹp nhất hành tinh, Mường Thanh Luxury Đà Nẵng mang đến một kỳ nghỉ hoàn hảo giữa biển xanh cát trắng nắng vàng.",
    amenities: ["View trực diện biển", "Hồ bơi", "Nhà hàng", "Phòng Gym", "Wifi tốc độ cao", "Karaoke"],
    type: "Khách sạn"
  },
  {
    id: "dn5",
    name: "Pullman Danang Beach Resort",
    rating: 5,
    reviews: 1200,
    location: "725 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng",
    price: 3500000,
    originalPrice: 4200000,
    tag: "Nghỉ dưỡng",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop"
    ],
    description: "Resort 5 sao mang thương hiệu Pullman tọa lạc trên bãi cát trắng mịn màng. Không gian sống mở, thoáng đãng kết nối trực tiếp với thiên nhiên, mang lại sự trẻ trung và sáng tạo cho du khách.",
    amenities: ["Bãi biển riêng", "Hồ bơi rộng rãi", "Spa & Wellness", "Nhà hàng sát biển", "Cà phê Azure", "Khu thể thao"],
    type: "Resort"
  },
  {
    id: "dn6",
    name: "A La Carte Da Nang Beach",
    rating: 4,
    reviews: 2200,
    location: "200 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
    price: 1600000,
    originalPrice: 2100000,
    tag: "Độ phổ biến",
    image: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop"
    ],
    description: "A La Carte Da Nang Beach là tiên phong cho xu hướng khách sạn căn hộ hiện đại tại Đà Nẵng. Không gian trẻ trung, đầy đủ tiện ích như một ngôi nhà thu nhỏ.",
    amenities: ["Hồ bơi vô cực trên cao", "View toàn cảnh biển", "Sky Bar", "Khu vui chơi trẻ em", "Wifi miễn phí", "Bếp mini"],
    type: "Khách sạn"
  },
  {
    id: "dn7",
    name: "Sala Danang Beach Hotel",
    rating: 4,
    reviews: 950,
    location: "36 Lâm Hoành, Sơn Trà, Đà Nẵng",
    price: 1400000,
    originalPrice: 1800000,
    tag: "Mới mở",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop"
    ],
    description: "Chỉ cách bãi biển Mỹ Khê 2 phút đi bộ, Sala Danang Beach Hotel nổi bật với phong cách Nhật Bản thanh lịch. Dịch vụ tận tâm và đồ ăn ngon là điểm cộng cực lớn.",
    amenities: ["View biển", "Hồ bơi", "Nhà hàng", "Trà chiều miễn phí", "Xe đạp miễn phí"],
    type: "Khách sạn"
  },
  {
    id: "dn8",
    name: "Brilliant Hotel",
    rating: 4,
    reviews: 1100,
    location: "162 Bạch Đằng, Hải Châu, Đà Nẵng",
    price: 1200000,
    originalPrice: 1500000,
    tag: "Giá tốt",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop",
      "https://plus.unsplash.com/premium_photo-1661962360690-e91cc0df88f1?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1681922761648-d5e2c3972982?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Nằm trên con đường đẹp nhất ven sông Hàn, Brilliant Hotel là kết tinh của sự sang trọng và lãng mạn. Buổi tối ngắm cầu Rồng phun lửa từ nhà hàng của khách sạn là một trải nghiệm tuyệt vời.",
    amenities: ["View trực diện sông Hàn", "Rooftop bar nổi tiếng", "Hồ bơi", "Nhà hàng bít-tết", "Wifi tốc độ cao"],
    type: "Khách sạn"
  },
  {
    id: "dn9",
    name: "Hilton Da Nang",
    rating: 5,
    reviews: 800,
    location: "50 Bạch Đằng, Hải Châu, Đà Nẵng",
    price: 2500000,
    originalPrice: 3200000,
    tag: "Thương hiệu quốc tế",
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
      "https://plus.unsplash.com/premium_photo-1661962360690-e91cc0df88f1?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1594099462046-1df31fd4a66c?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ],
    description: "Thương hiệu quốc tế đình đám Hilton mang đến trải nghiệm đẳng cấp 5 sao ngay giữa trung tâm Đà Nẵng. Cơ sở vật chất mới tinh, nội thất tinh tế cùng hệ thống nhà hàng hiện đại.",
    amenities: ["Hồ bơi", "Gym 24/7", "Nhà hàng The Sail", "Dịch vụ phòng 24h", "Wifi tốc độ cao"],
    type: "Khách sạn"
  },
  {
    id: "dn10",
    name: "Sanouva Danang Hotel",
    rating: 4,
    reviews: 1350,
    location: "68 Phan Châu Trinh, Hải Châu, Đà Nẵng",
    price: 900000,
    originalPrice: 1200000,
    tag: "Khuyến mãi HOT",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop"
    ],
    description: "Khách sạn đậm chất cổ điển Châu Âu ngay giữa lòng thành phố nhộn nhịp. Sanouva nổi tiếng với các dịch vụ spa miễn phí đi kèm gói phòng, rất phù hợp cho những ai muốn thư giãn hoàn toàn.",
    amenities: ["Trung tâm TP", "Miễn phí 1 liệu trình Spa", "Nhà hàng", "Gym", "Lễ tân thân thiện 24h"],
    type: "Khách sạn"
  },
  // ===== Khách sạn mặc định cho trang Payment (khi không có dữ liệu truyền vào) =====
  {
    id: "hl11",
    name: "Halong Elegance",
    rating: 5,
    reviews: 128,
    location: "Hạ Long, Việt Nam",
    price: 3200000,
    originalPrice: 4000000,
    tag: "View đẹp",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542314831-c6a4d14b4fb2?w=800&auto=format&fit=crop"
    ],
    description: "Tọa lạc ngay bên bờ kỳ quan thiên nhiên thế giới, Halong Elegance là sự giao thoa hoàn hảo giữa nét đẹp kiến trúc hiện đại và hơi thở bình yên của biển cả. Mỗi căn phòng tại đây đều được thiết kế với không gian mở, sử dụng hệ thống kính kịch trần để thu trọn toàn cảnh vịnh Hạ Long hùng vĩ vào trong tầm mắt. Nội thất được lựa chọn tỉ mỉ với gam màu trung tính, tạo nên một tổng thể thanh lịch, sang trọng nhưng vẫn mang lại cảm giác ấm cúng, thư thái. Không chỉ dừng lại ở tiện nghi lưu trú, nơi đây còn mang đến trải nghiệm sống đẳng cấp thông qua hệ thống trang thiết bị thông minh và dịch vụ tận tâm. Du khách có thể tận hưởng những phút giây tĩnh lặng tại ban công riêng, nơi tiếng sóng vỗ rì rào trở thành bản giao hưởng chữa lành tâm hồn. Từng chi tiết nhỏ trong bài trí đều được chăm chút kỹ lưỡng nhằm phản ánh gu thẩm mỹ tinh tế và cam kết về chất lượng nghỉ dưỡng thượng lưu. Halong Elegance hứa hẹn là điểm dừng chân lý tưởng để bạn gác lại mọi âu lo và đắm mình hoàn toàn vào thiên nhiên thơ mộng. Đây chính là khởi đầu hoàn hảo cho hành trình khám phá vẻ đẹp bất tận của vùng đất di sản nghìn năm.",
    amenities: ["Wifi miễn phí", "Bể bơi", "Dịch vụ spa", "Điều hòa", "Chỗ để xe riêng", "Phòng ăn"],
    type: "Khách sạn",
    roomsLeft: 3
  }
];
