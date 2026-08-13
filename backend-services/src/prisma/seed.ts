import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ==================== CREATE ADMIN USER ====================
  console.log('📝 Creating admin user...');
  
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommercetimor.com' },
    update: {},
    create: {
      email: 'admin@ecommercetimor.com',
      password: adminPassword,
      name: 'Administrator',
      role: Role.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ==================== CREATE CATEGORIES ====================
  console.log('📝 Creating categories...');

  const categories = [
    { name: 'Eletrónika', nameTetum: 'Eletrónika', description: 'Produtu eletrónika no dijitál' },
    { name: 'Ropa & Moda', nameTetum: 'Ropa & Moda', description: 'Ropa, sapatu no asesóriu moda' },
    { name: 'Hasan Laran', nameTetum: 'Hasan Laran', description: 'Ekipamentu hasan laran no utensíliu' },
    { name: 'Livru', nameTetum: 'Livru', description: 'Livru iha lian Portugés, Tetun no Inglés' },
    { name: 'Brinquedu', nameTetum: 'Brinquedu', description: 'Brinquedu ba labarik' },
    { name: 'Local Products', nameTetum: 'Produtu Lokal', description: 'Produtu nebee sai husi Timor-Leste', },
    { name: 'Saúde & Beleza', nameTetum: 'Saúde & Beleza', description: 'Produtu saúde, kosmétiku no kuidado pesoál' },
    { name: 'Esporte & Lazer', nameTetum: 'Esporte & Lazer', description: 'Ekipamentu esporte no atividade lazer' },
    { name: 'Automotivu', nameTetum: 'Automotivu', description: 'Aksesóriu no komponente veíkulu' },
    { name: 'Furniture', nameTetum: 'Furniture', description: 'Meza, kadeira no móveis seluk' },
    { name: 'Agrikultura', nameTetum: 'Agrikultura', description: 'Ekipamentu agrikultura no semente' },
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        nameTetum: cat.nameTetum,
        description: cat.description,
        slug,
        order: i + 1,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${categories.length} categories created`);

  // ==================== CREATE SAMPLE USER ====================
  console.log('📝 Creating sample customer...');
  
  const userPassword = await bcrypt.hash('User@123', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: userPassword,
      name: 'João Customer',
      phone: '+670 1234 5678',
      role: Role.CUSTOMER,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✅ Customer created: ${customer.email}`);

  // ==================== CREATE SAMPLE SELLER ====================
  console.log('📝 Creating sample seller...');
  
  const sellerPassword = await bcrypt.hash('Seller@123', 10);
  
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      password: sellerPassword,
      name: 'Maria Seller',
      phone: '+670 8765 4321',
      role: Role.SELLER,
      emailVerified: true,
      isActive: true,
    },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      storeName: 'Loja Example Timor',
      storePhone: '+670 8765 4321',
      storeEmail: 'loja@example.com',
      storeAddress: 'Rua de Dili, Dili, Timor-Leste',
      description: 'Loja online nebee fornese produtu ho kualidade',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
    },
  });
  console.log(`✅ Seller created: ${seller.storeName}`);

  // ==================== CREATE SAMPLE PRODUCTS ====================
  console.log('📝 Creating sample products...');

  const category = await prisma.category.findFirst({ where: { name: 'Eletrónika' } });
  const localCategory = await prisma.category.findFirst({ where: { name: 'Local Products' } });
  
  if (category) {
    const products = [
      {
        name: 'Smartphone XYZ Pro',
        nameTetum: 'Smartphone XYZ Pro',
        description: 'Smartphone ho sistema kamera avansadu no bateria durasaun longa',
        descriptionTetum: 'Smartphone ho sistema kamera avansadu no bateria durasaun longa',
        price: 299.99,
        comparePrice: 399.99,
        stock: 50,
        sku: 'PHONE-001',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'smartphone-xyz-pro',
      },
      {
        name: 'Laptop UltraBook',
        nameTetum: 'Laptop UltraBook',
        description: 'Laptop levezin ho prosesador boot ba servisu no estudu',
        descriptionTetum: 'Laptop levezin ho prosesador boot ba servisu no estudu',
        price: 899.99,
        comparePrice: 1099.99,
        stock: 25,
        sku: 'LAPTOP-001',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'laptop-ultrabook',
      },
      {
        name: 'Headphone Wireless',
        nameTetum: 'Headphone Wireless',
        description: 'Headphone Bluetooth ho kualidade som boot',
        descriptionTetum: 'Headphone Bluetooth ho kualidade som boot',
        price: 49.99,
        comparePrice: 79.99,
        stock: 100,
        sku: 'AUDIO-001',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'headphone-wireless',
      },
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: {
          ...product,
          sellerId: seller.id,
          categoryId: category.id,
          isActive: true,
          isFeatured: true,
        },
      });
    }
    console.log(`✅ ${products.length} products created`);
  }

  if (localCategory) {
    const localProducts = [
      {
        name: 'Handwoven Basket',
        nameTetum: 'Kesta Manin',
        description: 'Handwoven basket from local Timorese artisans',
        descriptionTetum: 'Kesta manin husi artesánu Timor-Leste',
        price: 24.99,
        comparePrice: 34.99,
        stock: 20,
        sku: 'LOCAL-001',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'handwoven-basket',
      },
      {
        name: 'Timor Coffee Beans',
        nameTetum: 'Kafe Biji Timor',
        description: 'Locally roasted coffee beans from Timor-Leste',
        descriptionTetum: 'Kafe biji lokal husi Timor-Leste',
        price: 18.5,
        comparePrice: 24.99,
        stock: 40,
        sku: 'LOCAL-002',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'timor-coffee-beans',
      },
      {
        name: 'Sea Salt Pack',
        nameTetum: 'Sal Mar',
        description: 'Premium sea salt harvested from Timor-Leste shores',
        descriptionTetum: 'Sal mar premium husi marra Timor-Leste',
        price: 12.99,
        comparePrice: 16.99,
        stock: 60,
        sku: 'LOCAL-003',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
        thumbnail: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        slug: 'sea-salt-pack',
      },
    ];

    for (const product of localProducts) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: {
          ...product,
          sellerId: seller.id,
          categoryId: localCategory.id,
          isActive: true,
          isFeatured: true,
        },
      });
    }
    console.log(`✅ ${localProducts.length} local products created`);

    // ==================== KRIA VIDEO SIMPES IMPLEMENTA MOCK DATA  ====================
    console.log('📝 Creating sample videos...');

    const sampleVideos = [
      {
        title: 'Smartphone XYZ Pro Demo',
        description: 'Watch the latest smartphone features in action.',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        productSlug: 'smartphone-xyz-pro',
      },
      {
        title: 'Laptop UltraBook Review',
        description: 'A premium productivity laptop in real-world use.',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/stock.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        productSlug: 'laptop-ultrabook',
      },
      {
        title: 'Timor Coffee Beans Story',
        description: 'Discover the story behind our premium coffee beans.',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
        thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        productSlug: 'timor-coffee-beans',
      },
    ];
    for (const video of sampleVideos) {
      const product = await prisma.product.findUnique({ where: { slug: video.productSlug } });
      const existingVideo = await (prisma as any).video.findFirst({
        where: { title: video.title },
      });

      if (existingVideo) {
        await (prisma as any).video.update({
          where: { id: existingVideo.id },
          data: {
            description: video.description,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            status: 'PUBLISHED',
            productId: product?.id ?? null,
            isActive: true,
          },
        });
      } else {
        await (prisma as any).video.create({
          data: {
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            status: 'PUBLISHED',
            productId: product?.id ?? null,
            isActive: true,
          },
        });
      }
    }
    console.log('✅ Sample videos created');
  }

  // ==================== CREATE SAMPLE ADDRESS ====================
  console.log('📝 Creating sample address...');

  const country = await prisma.country.upsert({
    where: { code: 'TL' },
    update: {},
    create: {
      name: 'Timor-Leste',
      code: 'TL',
      isActive: true,
    },
  });

  const province = await prisma.province.upsert({
    where: {
      countryId_name: {
        countryId: country.id,
        name: 'Dili',
      },
    },
    update: {},
    create: {
      countryId: country.id,
      name: 'Dili',
      code: 'DIL',
      isActive: true,
    },
  });

  const municipality = await prisma.municipality.upsert({
    where: {
      provinceId_name: {
        provinceId: province.id,
        name: 'Dili',
      },
    },
    update: {},
    create: {
      provinceId: province.id,
      name: 'Dili',
      code: 'DIL',
      isActive: true,
    },
  });

  await prisma.address.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: customer.id,
      label: 'Uma',
      provinceId: province.id,
      municipalityId: municipality.id,
      province: province.name,
      municipality: municipality.name,
      postoAdmin: 'Cristo Rei',
      suco: 'Bidau Lecidere',
      village: '12 de Novembro',
      street: 'Rua de Bidau',
      reference: 'Igreja Matadouro',
      phone: '+670 1234 5678',
      isPrimary: true,
    },
  });
  console.log('✅ Address created');

  // ==================== CREATE SYSTEM NOTIFICATIONS ====================
  console.log('📝 Creating system notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        title: 'Welcome to E-commerce Timor-Leste!',
        message: 'Obrigado ba rejistu iha ita-nia plataforma. Hafohe kompras diak!',
        type: 'SYSTEM',
        isRead: false,
      },
      {
        userId: seller.id,
        title: 'Store Verified!',
        message: 'Parabens! Ita-nia loja "Loja Example Timor" onu verifika ona. Ita bele komesa faan produtu.',
        type: 'SYSTEM',
        isRead: false,
      },
    ],
  });
  console.log('✅ Notifications created');
  console.log('\n🎉 Database seeding completed successfully!');
  console.log('========================================');
  console.log('🔑 Login Credentials:');
  console.log('   Admin:   admin@ecommercetimor.com / Admin@123');
  console.log('   Seller:  seller@example.com / Seller@123');
  console.log('   Customer: customer@example.com / User@123');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
