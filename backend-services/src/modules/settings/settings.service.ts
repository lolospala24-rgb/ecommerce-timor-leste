import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SystemSettingsDto } from './dto/system-settings.dto';

// Read-cache prefixes that are safe for an admin to blow away on demand —
// deliberately an allowlist, not a blocklist, so security-sensitive keys
// (token_blacklist:*, login_attempts:*) can never end up cleared just
// because someone forgot to exclude them.
const CLEARABLE_CACHE_PREFIXES = [
  'addresses:user:',
  'admin:dashboard:',
  'admin:orders:',
  'admin:revenue:',
  'cart:user:',
  'category:',
  'dashboard:',
  'notifications:',
  'order:',
  'payment:',
  'product:',
  'products:',
  'review:stats:',
  'search:',
  'seller:',
  'user:',
];

const SETTINGS_CACHE_KEY = 'system:settings';
const SETTINGS_CACHE_TTL = 300;
const PASSWORD_MASK = '••••••••';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // The app always reads/writes a single row. Created on first read with
  // the schema's column defaults if it doesn't exist yet.
  async getSettings() {
    const cached = await this.redisService.get(SETTINGS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.redisService.del(SETTINGS_CACHE_KEY);
      }
    }

    let settings = await this.prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.systemSettings.create({ data: {} });
    }

    await this.redisService.set(SETTINGS_CACHE_KEY, JSON.stringify(settings), SETTINGS_CACHE_TTL);
    return settings;
  }

  // Admin-facing: the full row, minus the real SMTP password.
  async getAdminSettings() {
    const settings = await this.getSettings();
    return {
      ...settings,
      smtpPassword: settings.smtpPassword ? PASSWORD_MASK : '',
    };
  }

  // Storefront-facing: only what an anonymous visitor legitimately needs —
  // no SMTP credentials, no internal moderation toggles.
  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      address: settings.address,
      currency: settings.currency,
      taxRate: settings.taxRate,
      serviceFee: settings.serviceFee,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      enableReviews: settings.enableReviews,
      enableCOD: settings.enableCOD,
      enableBankTransfer: settings.enableBankTransfer,
      minCODOrderAmount: settings.minCODOrderAmount,
      maxCODOrderAmount: settings.maxCODOrderAmount,
      bankName: settings.bankName,
      bankAccountName: settings.bankAccountName,
      bankAccountNumber: settings.bankAccountNumber,
      bankIBAN: settings.bankIBAN,
      bankSWIFT: settings.bankSWIFT,
      bankTransferInstructions: settings.bankTransferInstructions,
    };
  }

  async updateSettings(dto: SystemSettingsDto) {
    const current = await this.getSettings();
    const data: SystemSettingsDto = { ...dto };

    // A masked or empty password means "leave it alone" — the admin UI
    // never round-trips the real secret back into the form.
    if (!data.smtpPassword || data.smtpPassword === PASSWORD_MASK) {
      delete data.smtpPassword;
    }

    await this.prisma.systemSettings.update({
      where: { id: current.id },
      data,
    });

    await this.redisService.del(SETTINGS_CACHE_KEY);
    return this.getAdminSettings();
  }

  async clearSettingsCache() {
    await this.redisService.del(SETTINGS_CACHE_KEY);
  }

  async clearAppCache(): Promise<number> {
    let cleared = 0;
    for (const prefix of CLEARABLE_CACHE_PREFIXES) {
      const keys = await this.redisService.keys(`${prefix}*`);
      if (keys.length > 0) {
        cleared += await this.redisService.delMany(keys);
      }
    }
    return cleared;
  }

  async clearAdminLogs(): Promise<number> {
    const result = await this.prisma.adminLog.deleteMany({});
    return result.count;
  }
}
