import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu seed Vouchers...');

  const endDate = new Date('2026-12-31T23:59:59Z');

  // 1. Tạo Promotion 1
  const promo1 = await prisma.promotion.create({
    data: {
      name: 'Giảm giá mùa hè',
      promoType: 'flash_sale',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderAmount: 200000,
      startDate: new Date(),
      endDate: endDate,
      isActive: true,
      createdBy: 1, // Giả sử user admin ID là 1
    }
  });

  await prisma.voucher.upsert({
    where: { code: 'GIAM50K' },
    update: {
      promotionId: promo1.id,
      isActive: true,
    },
    create: {
      code: 'GIAM50K',
      promotionId: promo1.id,
      maxUsesPerUser: 5,
      isActive: true,
    }
  });
  console.log('✅ Đã tạo voucher GIAM50K');

  // 2. Tạo Promotion 2
  const promo2 = await prisma.promotion.create({
    data: {
      name: 'Ưu đãi đặc biệt',
      promoType: 'custom',
      discountType: 'percent',
      discountValue: 10, // 10%
      maxDiscount: 500000,
      minOrderAmount: 100000,
      startDate: new Date(),
      endDate: endDate,
      isActive: true,
      createdBy: 1,
    }
  });

  await prisma.voucher.upsert({
    where: { code: 'MUAHE10' },
    update: {
      promotionId: promo2.id,
      isActive: true,
    },
    create: {
      code: 'MUAHE10',
      promotionId: promo2.id,
      maxUsesPerUser: 2,
      isActive: true,
    }
  });
  console.log('✅ Đã tạo voucher MUAHE10');

  // 3. Tạo Promotion 3
  const promo3 = await prisma.promotion.create({
    data: {
      name: 'Miễn phí dịch vụ',
      promoType: 'custom',
      discountType: 'percent',
      discountValue: 100, // 100% discount is essentially freeship if we apply it to fees, but here we just treat it as a 100% off with max discount
      maxDiscount: 100000,
      minOrderAmount: 0,
      startDate: new Date(),
      endDate: endDate,
      isActive: true,
      createdBy: 1,
    }
  });

  await prisma.voucher.upsert({
    where: { code: 'FREESHIP' },
    update: {
      promotionId: promo3.id,
      isActive: true,
    },
    create: {
      code: 'FREESHIP',
      promotionId: promo3.id,
      maxUsesPerUser: 1,
      isActive: true,
    }
  });
  console.log('✅ Đã tạo voucher FREESHIP');
  
  console.log('Hoàn tất seed Vouchers!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
