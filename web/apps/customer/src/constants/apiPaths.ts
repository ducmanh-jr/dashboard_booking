export const API_PATHS = {
  AUTH: {
    ME: "/auth/me",
    LOGOUT: "/auth/logout",
  },
  HOTELS: {
    SEARCH: "/public/rooms",
    DETAIL: (id: string | number) => `/public/rooms/${id}`,
  },
  BOOKINGS: {
    CHECKOUT: (id: string | number) => `/bookings`,
    MY_TRIPS: "/bookings/mine",
    STATUS: (id: string | number) => `/bookings/${id}/status`,
    CANCEL: (id: string | number) => `/bookings/${id}/cancel`,
  },
};
