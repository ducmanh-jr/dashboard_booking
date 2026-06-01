const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      transportConnections: true,
      nearbyPlaces: true,
    }
  });
  
  console.log('Total properties:', properties.length);
  const withTransport = properties.filter(p => p.transportConnections !== null);
  const withNearby = properties.filter(p => p.nearbyPlaces !== null);
  
  console.log('Properties with transportConnections:', withTransport.length);
  console.log('Properties with nearbyPlaces:', withNearby.length);
  
  if (properties.length > 0) {
    console.log('Sample properties:');
    properties.slice(0, 5).forEach(p => {
      console.log(`- ${p.name} (${p.slug}):`);
      console.log(`  transportConnections:`, p.transportConnections);
      console.log(`  nearbyPlaces:`, p.nearbyPlaces);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
