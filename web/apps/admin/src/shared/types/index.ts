export const ROOM_TYPES = ["1 sao", "2 sao", "3 sao", "4 sao", "5 sao", "Boutique", "Resort", "Homestay"];
export const COMMON_AMENITIES = [
  "Wifi miễn phí",
  "Điều hòa",
  "Tivi",
  "Tủ lạnh",
  "Máy nước nóng",
  "Bồn tắm",
  "Két sắt",
  "Bãi đỗ xe",
  "Hồ bơi",
  "Lễ tân 24h",
  "Bữa sáng",
  "Cho phép thú cưng",
  "Cho phép hút thuốc",
];
export const IMAGE_LABELS: Record<string, string> = {
  hotel_front: "Mặt tiền khách sạn",
  lobby: "Sảnh / Lễ tân",
  room_overview: "Phòng mẫu",
  common_area: "Khu vực chung",
  exterior: "Khuôn viên / Ngoại cảnh",
  other: "Ảnh khác"
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  entityId?: number;
  isRead: boolean;
  createdAt: string;
};

export type User = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
  title?: string;
};

export type Partner = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  hotelName: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  roomCount?: number;
};

export type Customer = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  loyaltyTier: string | null;
  loyaltyPoints: number;
  bookingCount: number;
  activeBookingCount: number;
  totalSpent: number;
  createdAt: string;
  lastLoginAt: string | null;
};

export type Price = { label: string; pricePerNight: number; area?: number | null; capacity?: number; bedInfo?: string; amenities?: string; imageUrls?: string[] };
export type NearbyPlace = { name: string; type: string; distanceM: number; lat: number; lon: number };
export type TransportConnection = { name: string; distance: string; note: string | null };

export type RoomPolicy = {
  checkInTime: string;
  checkOutTime: string;
  childrenFreeAge: number | null;
  refundable: boolean;
  freeCancelHours: number | null;
  cancellationNote: string | null;
  petAllowed: boolean;
  smokingAllowed: boolean;
  otherRules: string | null;
};

export type RoomChangeRequest = {
  id: number;
  action: "update" | "delete" | "create";
  status: string;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  payload?: Partial<Room>;
};

export type RoomImage = { category: string; url: string; caption: string | null };

export type Room = {
  id: number;
  name: string;
  description: string | null;
  roomType: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  area: number | null;
  amenities: string[];
  highlights: string[];
  transportConnections: TransportConnection[];
  nearbyPlaces: NearbyPlace[];
  policy: RoomPolicy;
  prices: Price[];
  images: RoomImage[];
  platformFeePct: number;
  promotionPct: number;
  status: string;
  isArchived?: boolean;
  isBookable?: boolean;
  archivedLabel?: string | null;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  pendingRequest?: RoomChangeRequest;
  partnerHotelName?: string;
  partnerEmail?: string;
  bookingStats?: {
    isActiveHotel: boolean;
    hasCurrentGuest: boolean;
    activeBookingCount: number;
    totalBookings: number;
    grossRevenue: number;
    partnerRevenue: number;
  };
};


