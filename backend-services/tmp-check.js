const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const addresses = await prisma.address.findMany({ where: { isActive: true } });
    console.log('addresses ok', addresses.length);
  } catch (e) {
    console.error('addresses err', e.message);
    console.error(e);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: 1 },
      include: {
        seller: true,
        customerAddress: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, thumbnail: true },
                },
              },
            },
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: { id: true, name: true, thumbnail: true },
            },
          },
        },
      },
    });
    console.log('profile ok', !!user);
  } catch (e) {
    console.error('profile err', e.message);
    console.error(e);
  }

  await prisma.$disconnect();
})();
