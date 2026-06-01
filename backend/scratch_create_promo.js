const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promo = await prisma.promotion.create({
    data: {
      name: 'Test Promo',
      promoType: 'custom',
      discountType: 'percent',
      discountValue: 10,
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000),
      isActive: true,
      createdBy: 1n,
    }
  });
  console.log('Created:', promo);
}

main().catch(console.error).finally(() => prisma.$disconnect());
