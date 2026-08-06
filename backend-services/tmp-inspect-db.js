const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== ADDRESSES ===');
    const addresses = await prisma.$queryRaw`SHOW COLUMNS FROM addresses`;
    console.log(JSON.stringify(addresses, null, 2));

    console.log('=== PROVINCES ===');
    const provinces = await prisma.$queryRaw`SHOW COLUMNS FROM provinces`;
    console.log(JSON.stringify(provinces, null, 2));

    console.log('=== MUNICIPALITIES ===');
    const municipalities = await prisma.$queryRaw`SHOW COLUMNS FROM municipalities`;
    console.log(JSON.stringify(municipalities, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
