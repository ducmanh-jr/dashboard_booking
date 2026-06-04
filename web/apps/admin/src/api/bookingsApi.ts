import { api } from "@nowayhome/api-client";

export const fetchBookingReport = async () => {
  return await api("/admin/booking-report");
};

export const fetchBookings = async () => {
  return await api("/admin/bookings");
};

export const markBookingPaid = async (id: number) => {
  return await api(`/admin/bookings/${id}/mark-paid`, { method: "POST" });
};

export const cancelBooking = async (id: number) => {
  return await api(`/admin/bookings/${id}/cancel`, { method: "POST" });
};

export const rejectCancelBooking = async (id: number) => {
  return await api(`/admin/bookings/${id}/reject-cancel`, { method: "POST" });
};
