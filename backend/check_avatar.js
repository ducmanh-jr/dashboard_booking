const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findFirst({ where: { email: 'nguyenducmanh.ovaltine@gmail.com' } });
  console.log('Avatar in DB:', u?.avatarUrl);
}
main().finally(() => prisma.$disconnect());
