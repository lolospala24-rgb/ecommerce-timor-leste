// placeholder for src/common/utils/jwt.util.ts
import * as jwt from 'jsonwebtoken';

interface DecodedToken {
  sub?: number;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * @param token - JWT token string
 * @returns Decoded token payload or null
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as unknown as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - JWT token string
 * @returns Boolean indicating if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get remaining time for token in seconds
 * @param token - JWT token string
 * @returns Seconds remaining or 0 if expired
 */
export function getTokenRemainingTime(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * Extract user ID from token
 * @param token - JWT token string
 * @returns User ID or null
 */
export function getUserIdFromToken(token: string): number | null {
  const decoded = decodeToken(token);
  return decoded?.sub || null;
}

/**
 * Extract user email from token
 * @param token - JWT token string
 * @returns User email or null
 */
export function getUserEmailFromToken(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.email || null;
}

/**
 * Verify JWT token (synchronous)
 * @param token - JWT token string
 * @param secret - Secret key
 * @returns Decoded payload or throws error
 */
export function verifyTokenSync(token: string, secret: string): DecodedToken {
  return jwt.verify(token, secret) as unknown as DecodedToken;
}