import crypto from "crypto";
import { pool } from "../../db.js";
import { formatTimeValue, getPriceAvailabilityByNight, getActiveFeeConfig, applyFeeConfig } from "../hotels/hotels.service.js"; // some overlap

// Helper functions extracted from rooms.js for bookings
export function normalizeDateOnly(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function diffNights(checkIn, checkOut) {
  const inDate = new Date(`${checkIn}T00:00:00Z`);
  const outDate = new Date(`${checkOut}T00:00:00Z`);
  return Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
}

export function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function listNightDates(checkIn, checkOut) {
  const nights = diffNights(checkIn, checkOut);
  return Array.from({ length: Math.max(0, nights) }, (_item, index) => addDays(checkIn, index));
}

export function makeBookingCode() {
  return `BK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`.slice(0, 30);
}

export async function quoteBooking(propertyId, priceLabel, checkInDate, checkOutDate, conn = pool, options = {}) {
  const nights = diffNights(checkInDate, checkOutDate);
  if (nights < 1 || nights > 60) throw new Error("Ngay nhan/tra phong khong hop le");

  const [propertyRows] = await conn.query(
    `SELECT id, name, status, platform_fee_pct FROM properties WHERE id=? LIMIT 1${options.lockProperty ? " FOR UPDATE" : ""}`,
    [propertyId]
  );
  const property = propertyRows[0];
  if (!property || property.status !== "active") throw new Error("Khach san khong kha dung");

  const [priceRows] = await conn.query(
    `SELECT id, label, price_per_night, total_inventory
       FROM property_pricing
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [propertyId]
  );
  const selected = priceRows.find((item) => item.label === priceLabel) || priceRows[0];
  if (!selected) throw new Error("Khach san chua co hang phong");

  const totalInv = Number(selected.total_inventory || 1);
  
  const availability = await getPriceAvailabilityByNight(conn, {
    propertyId,
    pricingId: selected.id,
    priceLabel: selected.label,
    checkInDate,
    checkOutDate,
    totalInventory: totalInv,
    basePricePerNight: Number(selected.price_per_night),
  });
  if (!availability.isAvailable) {
    throw new Error("Het phong: Loai phong nay khong con du ton kho trong mot hoac nhieu ngay ban chon.");
  }

  const pricePerNight = Number(selected.price_per_night);
  const subtotal = Math.round(availability.subtotal || pricePerNight * nights);
  const taxConfig = await getActiveFeeConfig("tax");
  const platformConfig = await getActiveFeeConfig("platform");
  const taxAmount = 0; // Thue da bao gom trong gia phong
  const platformFeeAmount = platformConfig
    ? applyFeeConfig(platformConfig, subtotal)
    : Math.round(subtotal * Number(property.platform_fee_pct || 0) / 100);
  
  const total = subtotal; 

  return {
    property,
    price: selected,
    nights,
    pricePerNight,
    subtotal,
    taxAmount,
    platformFeeAmount,
    total,
    taxConfig,
    platformConfig,
    isAvailable: true,
    remainingRooms: availability.minRemaining,
    dailyAvailability: availability.dates,
  };
}

export function mapBookingReportRow(row) {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    priceLabel: row.price_label,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    nights: Number(row.num_nights || 0),
    adults: Number(row.num_adults || 0),
    children: Number(row.num_children || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal_amount || 0),
    total: Number(row.total_amount || 0),
    platformFee: Number(row.platform_fee_amount || 0),
    partnerPayout: Number(row.partner_payout_amount || 0),
    createdAt: row.created_at,
    specialRequests: row.special_requests,
    isCompleted: !!row.is_completed,
    isCurrentStay: !!row.is_current_stay,
    isFutureStay: !!row.is_future_stay,
    checkInTime: formatTimeValue(row.check_in_from),
    checkOutTime: formatTimeValue(row.check_out_until),
  };
}
