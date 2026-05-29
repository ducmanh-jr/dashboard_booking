import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }});
  console.log(JSON.stringify(users, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  process.exit(0);
}
run();
