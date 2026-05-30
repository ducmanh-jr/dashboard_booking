import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find a booking that is active (e.g. pending, confirmed, checked_in)
  const booking = await prisma.booking.findFirst({
    where: {
      status: { in: ['pending', 'confirmed', 'checked_in'] },
    },
    include: {
      ratePlan: {
        include: {
          roomType: true
        }
      },
      property: true
    },
    orderBy: {
      checkInDate: 'desc'
    }
  });

  if (!booking) {
    console.log("Không tìm thấy booking nào đang active.");
    return;
  }

  console.log("=== BOOKING FOUND ===");
  console.log(`Property: ${booking.property.name} (ID: ${booking.propertyId})`);
  console.log(`RatePlan: ${booking.ratePlan.name} (ID: ${booking.ratePlanId})`);
  console.log(`Check In: ${booking.checkInDate}`);
  console.log(`Check Out: ${booking.checkOutDate}`);
  console.log(`Status: ${booking.status}`);

  // Now let's check the availability logic for this property and rate plan
  const ratePlanId = booking.ratePlanId;
  const roomType = booking.ratePlan.roomType;
  
  // Find all active bookings for this rate plan in that period
  const activeBookings = await prisma.booking.findMany({
    where: {
      ratePlanId: ratePlanId,
      status: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
      checkOutDate: { gt: booking.checkInDate },
      checkInDate: { lt: booking.checkOutDate }
    }
  });
  
  console.log("\n=== ACTIVE BOOKINGS IN THIS PERIOD ===");
  console.log(`Found ${activeBookings.length} bookings.`);
  
  const bookedByDate = new Map<string, number>();
  for (const bk of activeBookings) {
    const checkIn = new Date(bk.checkInDate);
    const checkOut = new Date(bk.checkOutDate);
    for (let d = new Date(checkIn); d < checkOut; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      bookedByDate.set(key, (bookedByDate.get(key) ?? 0) + 1);
    }
  }
  
  console.log("\n=== INVENTORY CALCULATION ===");
  console.log(`Total Rooms for this RoomType: ${roomType.totalRooms}`);
  
  const checkInStr = new Date(booking.checkInDate).toISOString().slice(0, 10);
  const bookedOnCheckIn = bookedByDate.get(checkInStr) ?? 0;
  
  console.log(`Date: ${checkInStr}`);
  console.log(`Booked: ${bookedOnCheckIn}`);
  console.log(`Remaining: ${Math.max(0, roomType.totalRooms - bookedOnCheckIn)}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
