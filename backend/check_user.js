const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      userType: true
    }
  });
  console.log('\n--- USERS IN DATABASE ---');
  users.forEach(u => {
    console.log(`ID: ${u.id.toString()}, Email: ${u.email}, Phone: ${u.phone || 'N/A'}, Name: ${u.fullName || 'N/A'}, UserType: ${u.userType}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
