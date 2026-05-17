import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const createBooking = async (hotelId: string | number, data: any) => {
  return await api(API_PATHS.BOOKINGS.CHECKOUT(hotelId), {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const fetchMyTrips = async () => {
  return await api(API_PATHS.BOOKINGS.MY_TRIPS);
};

export const fetchBookingStatus = async (id: string | number) => {
  return await api(API_PATHS.BOOKINGS.STATUS(id));
};

export const cancelBooking = async (id: string | number, reason: string) => {
  return await api(API_PATHS.BOOKINGS.CANCEL(id), {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

export const mockPayBooking = async (bookingId: number) => {
  return await api("/mock-payment", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  });
};
