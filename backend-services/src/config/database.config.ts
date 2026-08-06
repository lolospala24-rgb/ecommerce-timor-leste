// placeholder for src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000, // milliseconds
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
  },
  retry: {
    attempts: parseInt(process.env.DB_RETRY_ATTEMPTS, 10) || 5,
    delay: parseInt(process.env.DB_RETRY_DELAY, 10) || 3000,
  },
  timezone: process.env.DB_TIMEZONE || 'UTC',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
}));