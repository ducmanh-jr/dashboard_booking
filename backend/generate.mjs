import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING BULK DAILY RATES GENERATION ---');

  const ratePlans = await prisma.ratePlan.findMany({
    include: {
      roomType: true,
    },
  });

  if (!ratePlans || ratePlans.length === 0) {
    console.log('Không có RatePlan nào trong database.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Tìm thấy ${ratePlans.length} RatePlans. Đang tiến hành tạo giá cho 60 ngày tới...`);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let totalInserted = 0;

  for (const plan of ratePlans) {
    const dailyRates = [];
    const availableQty = plan.roomType?.totalRooms || 5;

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);

      dailyRates.push({
        ratePlanId: plan.id,
        date: date,
        price: plan.basePrice,
        availableQty: availableQty,
        minStay: 1,
      });
    }

    try {
      const result = await prisma.dailyRate.createMany({
        data: dailyRates,
        skipDuplicates: true, // Tránh lỗi trùng lặp constraint
      });
      totalInserted += result.count;
    } catch (error) {
      console.error(`Lỗi khi tạo giá cho ratePlanId ${plan.id}:`, error.message);
    }
  }

  console.log(`\nĐã tạo thành công ${totalInserted} bản ghi DailyRate!`);
  console.log('--- COMPLETE ---');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('\n--- FAILED ---');
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
