export type User = { id: number; email: string; fullName: string; phone: string | null; role: string; status: string };

export type Price = {
  label: string;
  pricePerNight: number;
  totalInventory: number;
  area: number | null;
  capacity: number | null;
  bedInfo: string | null;
  amenities: string | null;
  imageUrls: string[];
  isAvailable?: boolean;
  remainingRooms?: number;
};

export type RoomImage = { category: string; url: string; caption: string | null };
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

export type Room = {
  id: number;
  name: string;
  description: string | null;
  roomType: string;
  address: string;
  city: string | null;
  capacity: number;
  amenities: string[];
  highlights: string[];
  transportConnections: TransportConnection[];
  nearbyPlaces: NearbyPlace[];
  images: RoomImage[];
  prices: Price[];
  policy: RoomPolicy;
  platformFeePct: number;
  promotionPct: number;
  status: string;
};

export type Booking = {
  id: number;
  bookingCode: string;
  propertyId: number;
  propertyName: string;
  city: string | null;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  checkInTime?: string;
  checkOutTime?: string;
};

export type SearchState = {
  q: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export const STAR_FILTERS = ["1 sao", "2 sao", "3 sao", "4 sao", "5 sao", "Boutique", "Resort", "Homestay"];

