// placeholder for src/config/jwt.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // Access token
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  
  // Refresh token
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Options
  algorithm: 'HS256' as const,
  audience: process.env.JWT_AUDIENCE || 'ecommerce-timor',
  issuer: process.env.JWT_ISSUER || 'ecommerce-timor-api',
  
  // Email verification token (short lived)
  emailVerificationExpiresIn: '24h',
  
  // Password reset token (short lived)
  passwordResetExpiresIn: '1h',
}));