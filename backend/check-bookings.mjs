import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.booking.findMany({
  where: { bookingCode: { contains: 'MPU4R1UL' } },
  select: { id: true, bookingCode: true, status: true, totalAmount: true }
});
console.log('Found:', JSON.stringify(rows.map(r => ({...r, id: r.id.toString(), totalAmount: r.totalAmount.toString()})), null, 2));

// Also check recent bookings
const recent = await p.booking.findMany({
  select: { id: true, bookingCode: true, status: true },
  orderBy: { createdAt: 'desc' },
  take: 5
});
console.log('Recent:', JSON.stringify(recent.map(r => ({...r, id: r.id.toString()})), null, 2));
await p.$disconnect();
