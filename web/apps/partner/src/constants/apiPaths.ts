export const API_PATHS = {
  AUTH: {
    ME: "/auth/me",
    LOGOUT: "/auth/logout",
  },
  ROOMS: {
    LIST: "/partner/rooms",
    DETAIL: (id: string | number) => `/partner/rooms/${id}`,
    CREATE: "/partner/rooms",
    UPDATE: (id: string | number) => `/partner/rooms/${id}`,
    DELETE: (id: string | number) => `/partner/rooms/${id}`,
  },
  BOOKINGS: {
    LIST: "/partner/booking-report",
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
  },
  PLACES: {
    SEARCH: (q: string) => `/places/search?q=${encodeURIComponent(q)}`,
    NEARBY: (lat: number, lon: number, radius: number, cats: string) => `/places/nearby?lat=${lat}&lon=${lon}&radius=${radius}&cats=${cats}`,
  },
};
