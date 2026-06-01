const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promos = await prisma.promotion.findMany({
    where: { deletedAt: null },
    include: {
      partner: { select: { businessName: true } },
      vouchers: { select: { id: true, code: true, isActive: true, totalUsed: true, maxUsesPerUser: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Found:', promos.length);
  
  // Test mapPromotion logic
  const mapped = promos.map(p => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);

    let status;
    if (!p.isActive) {
      status = 'inactive';
    } else if (start > today) {
      status = 'upcoming';
    } else if (end < today) {
      status = 'expired';
    } else {
      status = 'active';
    }

    return {
      id: Number(p.id),
      name: p.name,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10),
      status,
      partnerName: p.partner?.businessName ?? null,
      partnerId: p.partnerId ? Number(p.partnerId) : null,
      voucherCount: p.vouchers?.length ?? 0,
    };
  });
  console.log(mapped);
}

main().catch(console.error).finally(() => prisma.$disconnect());
