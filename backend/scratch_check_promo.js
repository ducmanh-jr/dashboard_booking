const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promos = await prisma.promotion.findMany();
  console.log('Promotions:', promos.length);
  console.log(promos);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
