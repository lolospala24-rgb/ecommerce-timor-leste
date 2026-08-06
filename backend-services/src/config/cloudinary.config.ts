// placeholder for src/config/cloudinary.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // Default folders
  folders: {
    products: 'ecommerce-timor/products',
    users: 'ecommerce-timor/users',
    stores: 'ecommerce-timor/stores',
    reviews: 'ecommerce-timor/reviews',
    banners: 'ecommerce-timor/banners',
    temp: 'ecommerce-timor/temp',
  },
  
  // Image transformations
  transformations: {
    product: {
      small: { width: 300, height: 300, crop: 'fill', quality: 80 },
      medium: { width: 600, height: 600, crop: 'fill', quality: 85 },
      large: { width: 1200, height: 1200, crop: 'fill', quality: 90 },
      thumbnail: { width: 100, height: 100, crop: 'thumb', quality: 70 },
    },
    banner: {
      desktop: { width: 1920, height: 600, crop: 'fill', quality: 85 },
      mobile: { width: 768, height: 400, crop: 'fill', quality: 80 },
    },
    user: {
      avatar: { width: 200, height: 200, crop: 'thumb', gravity: 'face', quality: 80 },
    },
  },
  
  // Upload options
  upload: {
    timeout: 60000, // 60 seconds
    chunkSize: 6000000, // 6MB
    useFilename: true,
    uniqueFilename: true,
    overwrite: false,
  },
  
  // Allowed formats
  allowedFormats: ['jpg', 'png', 'webp', 'jpeg', 'gif'],
  
  // Max file size (bytes)
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  // Enable to use delivery URLs with transformations
  secure: true,
}));