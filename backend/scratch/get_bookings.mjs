import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const bookings = await prisma.booking.findMany({ take: 2, orderBy: { createdAt: 'desc' }});
  console.log(JSON.stringify(bookings, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  process.exit(0);
}
run();
