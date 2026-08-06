import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient | null = null;
  private readonly redisEnabled: boolean;
  private readonly maxReconnectAttempts: number;
  private inMemory: {
    keyMap: Map<string, { value: string; expiresAt?: number }>;
    lists: Map<string, string[]>;
    zsets: Map<string, Map<string, number>>;
  };

  constructor(private readonly configService: ConfigService) {
    this.redisEnabled = String(this.configService.get('REDIS_ENABLED', 'true')).toLowerCase() !== 'false';
    this.maxReconnectAttempts = Number(this.configService.get('REDIS_RECONNECT_ATTEMPTS', 5));

    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get('REDIS_PORT', 6379));
    const password = this.configService.get('REDIS_PASSWORD');
    const db = Number(this.configService.get('REDIS_DB', 0));
    const tls = String(this.configService.get('REDIS_TLS', 'false')).toLowerCase() === 'true';

    if (!this.redisEnabled) {
      this.logger.warn('Redis is disabled via REDIS_ENABLED=false; using local in-memory store.');
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times >= this.maxReconnectAttempts) {
            this.logger.warn(`Redis reconnect limit reached (${this.maxReconnectAttempts}), stopping reconnect attempts.`);
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        tls: tls ? {} : undefined,
      });

      this.client.on('connect', () => this.logger.log('Connected to Redis'));
      this.client.on('ready', () => this.logger.log('Redis ready'));
      this.client.on('close', () => this.logger.warn('Redis connection closed'));
      this.client.on('end', () => this.logger.warn('Redis connection ended'));
      this.client.on('reconnecting', () => this.logger.log('Redis reconnecting'));
      this.client.on('error', (error) => {
        if (typeof (error as any).errors !== 'undefined' && Array.isArray((error as any).errors)) {
          this.logger.error('Redis AggregateError:');
          for (const e of (error as any).errors) {
            this.logger.error(e?.message || String(e));
          }
        } else {
          this.logger.error('Redis error', error as Error);
        }
      });
    }

    this.inMemory = {
      keyMap: new Map(),
      lists: new Map(),
      zsets: new Map(),
    };
  }

  private isRedisReady(): boolean {
    return Boolean(this.client && (this.client as any).status === 'ready');
  }

  async onModuleInit() {
    if (!this.redisEnabled || !this.client) {
      this.logger.warn('Redis client initialization skipped; continuing with in-memory fallback.');
      return;
    }

    try {
      const status = (this.client as any).status as string | undefined;
      if (status === 'connecting' || status === 'ready') {
        this.logger.log(`Redis client already ${status}, skipping connect`);
      } else {
        await this.client.connect();
        this.logger.log('Redis client connected (init)');
      }
    } catch (error) {
      if (typeof (error as any).errors !== 'undefined' && Array.isArray((error as any).errors)) {
        this.logger.error('Failed to connect to Redis on init (AggregateError)');
        for (const e of (error as any).errors) {
          this.logger.error(e?.message || String(e));
        }
      } else {
        this.logger.error('Failed to connect to Redis on init', error as Error);
      }
    }
  }

  async onModuleDestroy() {
    if (!this.client) return;

    try {
      await this.client.quit();
    } catch (error) {
      this.logger.error('Failed to close Redis connection', error as Error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisReady()) return this.client.get(key);
    const entry = this.inMemory.keyMap.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.inMemory.keyMap.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlInSeconds?: number): Promise<'OK' | null> {
    if (this.isRedisReady()) {
      if (ttlInSeconds) {
        return this.client.set(key, value, 'EX', ttlInSeconds);
      }
      return this.client.set(key, value);
    }
    const entry: { value: string; expiresAt?: number } = { value };
    if (ttlInSeconds) entry.expiresAt = Date.now() + ttlInSeconds * 1000;
    this.inMemory.keyMap.set(key, entry);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this.isRedisReady()) return this.client.del(key);
    return this.inMemory.keyMap.delete(key) ? 1 : 0;
  }

  // Deletes many keys in a single round trip instead of one DEL per key.
  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    if (this.isRedisReady()) return this.client.del(...keys);
    let count = 0;
    for (const key of keys) {
      if (this.inMemory.keyMap.delete(key)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.isRedisReady()) return this.client.keys(pattern);
    // simple glob '*' -> regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keys: string[] = [];
    for (const k of this.inMemory.keyMap.keys()) {
      if (regex.test(k)) keys.push(k);
    }
    return keys;
  }

  async expire(key: string, ttlInSeconds: number): Promise<number> {
    if (this.isRedisReady()) return this.client.expire(key, ttlInSeconds);
    const entry = this.inMemory.keyMap.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlInSeconds * 1000;
    this.inMemory.keyMap.set(key, entry);
    return 1;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.isRedisReady()) return this.client.lrange(key, start, stop);
    const list = this.inMemory.lists.get(key) || [];
    // handle negative indices like Redis
    const s = start < 0 ? Math.max(list.length + start, 0) : start;
    const e = stop < 0 ? list.length + stop : stop;
    return list.slice(s, e + 1);
  }

  async lpush(key: string, value: string): Promise<number> {
    if (this.isRedisReady()) return this.client.lpush(key, value);
    const list = this.inMemory.lists.get(key) || [];
    list.unshift(value);
    this.inMemory.lists.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (this.isRedisReady()) return this.client.ltrim(key, start, stop);
    const list = this.inMemory.lists.get(key) || [];
    const trimmed = list.slice(start, stop + 1);
    this.inMemory.lists.set(key, trimmed);
    return 'OK';
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    if (this.isRedisReady()) return this.client.lrem(key, count, value);
    const list = this.inMemory.lists.get(key) || [];
    let removed = 0;
    if (count === 0) {
      const filtered = list.filter((v) => {
        if (v === value) {
          removed++;
          return false;
        }
        return true;
      });
      this.inMemory.lists.set(key, filtered);
      return removed;
    }
    if (count > 0) {
      const res: string[] = [];
      for (const v of list) {
        if (v === value && removed < count) {
          removed++;
          continue;
        }
        res.push(v);
      }
      this.inMemory.lists.set(key, res);
      return removed;
    }
    // count < 0: remove from tail
    const res: string[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const v = list[i];
      if (v === value && removed < Math.abs(count)) {
        removed++;
        continue;
      }
      res.unshift(v);
    }
    this.inMemory.lists.set(key, res);
    return removed;
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    if (this.isRedisReady()) {
      const result = await this.client.zincrby(key, increment, member);
      return typeof result === 'string' ? Number(result) : result;
    }
    let z = this.inMemory.zsets.get(key);
    if (!z) {
      z = new Map();
      this.inMemory.zsets.set(key, z);
    }
    const current = z.get(member) || 0;
    const next = current + increment;
    z.set(member, next);
    return next;
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.isRedisReady()) return this.client.zrevrange(key, start, stop);
    const z = this.inMemory.zsets.get(key);
    if (!z) return [];
    const entries = Array.from(z.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    const s = start < 0 ? Math.max(entries.length + start, 0) : start;
    const e = stop < 0 ? entries.length + stop : stop;
    return entries.slice(s, e + 1);
  }
}

