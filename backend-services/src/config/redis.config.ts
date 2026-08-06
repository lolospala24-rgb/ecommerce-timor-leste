// placeholder for src/config/redis.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'ecommerce:',
  ttl: parseInt(process.env.REDIS_TTL, 10) || 3600, // default 1 hour
  
  enabled: process.env.REDIS_ENABLED?.toLowerCase() !== 'false',
  maxReconnectAttempts: parseInt(process.env.REDIS_RECONNECT_ATTEMPTS, 10) || 5,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  
  // For production with TLS
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // Cluster mode (optional)
  cluster: process.env.REDIS_CLUSTER === 'true',
  clusterNodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
}));