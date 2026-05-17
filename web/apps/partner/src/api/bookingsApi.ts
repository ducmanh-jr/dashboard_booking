import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const fetchBookings = async () => {
  return await api(API_PATHS.BOOKINGS.LIST);
};

export const fetchBookingReport = async () => {
  return await api("/partner/booking-report");
};

export const runBookingAction = async (id: number, action: "check-in" | "check-out" | "no-show") => {
  return await api(`/partner/bookings/${id}/${action}`, { method: "POST" });
};
