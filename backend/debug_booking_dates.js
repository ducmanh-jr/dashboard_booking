const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the property with ID 71 (from screenshot)
  const bookings = await prisma.booking.findMany({
    where: { propertyId: BigInt(71) },
    select: {
      id: true,
      bookingCode: true,
      status: true,
      paymentStatus: true,
      checkInDate: true,
      checkOutDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const nowVN = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  console.log(`Today (VN): ${nowVN}`);
  console.log(`Total bookings for property 71: ${bookings.length}\n`);

  for (const b of bookings) {
    const checkIn = b.checkInDate.toISOString().slice(0, 10);
    const checkOut = b.checkOutDate.toISOString().slice(0, 10);
    const isCancelled = b.status === 'cancelled';
    const isCurrentStay = !isCancelled && (
      b.status === 'checked_in' ||
      (['pending', 'confirmed'].includes(b.status) && checkIn <= nowVN && checkOut > nowVN)
    );
    const isCompleted = !isCancelled && !isCurrentStay &&
      (b.status === 'checked_out' || checkOut <= nowVN);
    const isFutureStay = !isCancelled &&
      ['pending', 'confirmed'].includes(b.status) && checkIn > nowVN;

    const category = b.status === 'cancelled' ? 'CANCELLED'
      : isCompleted ? 'COMPLETED'
      : isCurrentStay ? 'CURRENT'
      : isFutureStay ? 'FUTURE'
      : 'OTHER';

    console.log(`[${b.bookingCode}] status=${b.status} checkIn=${checkIn} checkOut=${checkOut} → ${category}`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
