// Script: fix platform_fee_amount cho các booking có giá trị = 0
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Kiểm tra trước
  const broken = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM bookings
    WHERE platform_fee_amount = 0 AND total_amount > 0 AND status != 'cancelled'
  `;
  console.log(`Bookings cần fix: ${broken[0].count}`);

  // 2. Update: platformFee = totalAmount * 10%, partnerPayout = totalAmount * 90%
  const result = await prisma.$executeRaw`
    UPDATE bookings
    SET
      platform_fee_amount  = ROUND(total_amount * 0.10, 2),
      partner_payout_amount = ROUND(total_amount * 0.90, 2)
    WHERE
      platform_fee_amount = 0
      AND total_amount > 0
      AND status != 'cancelled'
  `;
  console.log(`Đã cập nhật ${result} booking(s).`);

  // 3. Kiểm tra lại
  const sample = await prisma.$queryRaw`
    SELECT booking_code, total_amount, platform_fee_amount, partner_payout_amount, status
    FROM bookings
    WHERE total_amount > 0 AND status != 'cancelled'
    ORDER BY created_at DESC
    LIMIT 5
  `;
  console.log('\n--- Sample sau khi fix ---');
  for (const row of sample) {
    console.log(`${row.booking_code} | Total: ${row.total_amount} | Fee: ${row.platform_fee_amount} | Payout: ${row.partner_payout_amount} | Status: ${row.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
