const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const partners = await prisma.partnerProfile.findMany({
    select: { id: true, businessName: true, userId: true }
  });
  console.log('--- PARTNERS ---');
  partners.forEach(p => console.log(`Partner ID: ${p.id}, Name: ${p.businessName}, User ID: ${p.userId}`));

  const properties = await prisma.property.findMany({
    select: { id: true, name: true, partnerId: true }
  });
  console.log('\n--- PROPERTIES ---');
  properties.forEach(p => console.log(`Property ID: ${p.id}, Name: ${p.name}, Partner ID: ${p.partnerId}`));

  const promotions = await prisma.promotion.findMany({
    include: { vouchers: true }
  });
  console.log('\n--- PROMOTIONS & VOUCHERS ---');
  promotions.forEach(p => {
    console.log(`Promo ID: ${p.id}, Name: ${p.name}, Partner ID: ${p.partnerId}, isActive: ${p.isActive}, Dates: ${p.startDate.toISOString().slice(0,10)} to ${p.endDate.toISOString().slice(0,10)}`);
    p.vouchers.forEach(v => {
      console.log(`  -> Voucher Code: ${v.code}, isActive: ${v.isActive}`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
