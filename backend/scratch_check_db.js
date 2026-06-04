const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'doitac1@gmail.com' },
    include: {
      partnerProfile: {
        include: {
          properties: true
        }
      }
    }
  });

  if (!user) {
    console.log('User doitac1@gmail.com not found');
    return;
  }

  console.log(`User ID: ${user.id}, Email: ${user.email}`);
  if (user.partnerProfile) {
    console.log(`Partner ID: ${user.partnerProfile.id}, Business Name: ${user.partnerProfile.businessName}`);
    console.log('Properties owned:');
    user.partnerProfile.properties.forEach(p => {
      console.log(`  - Property ID: ${p.id}, Name: ${p.name}`);
    });
  } else {
    console.log('No partner profile for this user.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
