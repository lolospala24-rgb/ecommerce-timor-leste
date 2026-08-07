import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { ShippingSettingsDto } from './dto/shipping-settings.dto';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getShippingZones() {
    const cacheKey = 'shipping:zones';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const zones = await this.prisma.shippingZone.findMany({
        orderBy: [{ priority: 'desc' }, { zoneName: 'asc' }],
        select: {
          id: true,
          zoneName: true,
          provinceId: true,
          municipalityId: true,
          courierId: true,
          courierServiceId: true,
          courierRateId: true,
          shippingMethod: true,
          shippingCost: true,
          estimatedDeliveryDays: true,
          minimumWeight: true,
          maximumWeight: true,
          status: true,
          priority: true,
          provinceRef: {
            select: { id: true, name: true },
          },
          municipalityRef: {
            select: { id: true, name: true },
          },
          courier: {
            select: { id: true, name: true },
          },
          courierService: {
            select: { id: true, name: true, courier: { select: { id: true, name: true } } },
          },
        },
      });

      await this.redisService.set(cacheKey, JSON.stringify(zones), 300);
      return zones;
    } catch (error) {
      console.error('Failed to load shipping zones, returning fallback data.', error);
      return [];
    }
  }

  async createShippingZone(dto: CreateShippingZoneDto) {
    await this.clearShippingZonesCache();
    return this.prisma.shippingZone.create({
      data: {
        zoneName: dto.zoneName,
        provinceId: dto.provinceId,
        municipalityId: dto.municipalityId,
        courierId: dto.courierId,
        courierServiceId: dto.courierServiceId,
        courierRateId: dto.courierRateId,
        shippingMethod: dto.shippingMethod,
        shippingCost: dto.shippingCost,
        estimatedDeliveryDays: dto.estimatedDeliveryDays,
        minimumWeight: dto.minimumWeight,
        maximumWeight: dto.maximumWeight,
        status: dto.status ?? 'ACTIVE',
        priority: dto.priority ?? 0,
      },
    });
  }

  async setShippingZones(zones: CreateShippingZoneDto[]) {
    await this.prisma.$transaction(async (prisma) => {
      await prisma.shippingZone.deleteMany({});
      await prisma.shippingZone.createMany({
        data: zones.map((zone) => ({
          zoneName: zone.zoneName ?? 'Unnamed Zone',
          provinceId: zone.provinceId ?? null,
          municipalityId: zone.municipalityId ?? null,
          courierId: zone.courierId ?? null,
          courierServiceId: zone.courierServiceId ?? null,
          courierRateId: zone.courierRateId ?? null,
          shippingMethod: zone.shippingMethod ?? null,
          shippingCost: Number(zone.shippingCost ?? 0),
          estimatedDeliveryDays: zone.estimatedDeliveryDays ?? null,
          minimumWeight: zone.minimumWeight ?? null,
          maximumWeight: zone.maximumWeight ?? null,
          status: zone.status ?? 'ACTIVE',
          priority: Number(zone.priority ?? 0),
        })),
      });
    });

    await this.clearShippingZonesCache();
    return this.getShippingZones();
  }

  async getShippingSettings() {
    const cacheKey = 'shipping:settings';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      let settings = await this.prisma.shippingSetting.findFirst();
      if (!settings) {
        settings = await this.prisma.shippingSetting.create({
          data: {
            defaultShippingCost: 2.5,
            freeShippingThreshold: 50,
            enableFreeShipping: false,
            enableDynamicShipping: false,
            enableLocalPickup: false,
            defaultCourier: null,
            defaultShippingMethod: null,
          },
        });
      }

      await this.redisService.set(cacheKey, JSON.stringify(settings), 300);
      return settings;
    } catch (error) {
      console.error('Failed to load shipping settings, returning fallback data.', error);
      return {
        id: 0,
        defaultShippingCost: 2.5,
        freeShippingThreshold: 50,
        enableFreeShipping: false,
        enableDynamicShipping: false,
        enableLocalPickup: false,
        defaultCourier: null,
        defaultShippingMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async updateShippingSettings(dto: ShippingSettingsDto) {
    const settings = await this.getShippingSettings();

    await this.prisma.shippingSetting.upsert({
      where: { id: settings.id },
      create: {
        defaultShippingCost: dto.defaultShippingCost,
        freeShippingThreshold: dto.freeShippingThreshold,
        enableLocalPickup: dto.enableLocalPickup,
      },
      update: {
        defaultShippingCost: dto.defaultShippingCost ?? settings.defaultShippingCost,
        freeShippingThreshold: dto.freeShippingThreshold ?? settings.freeShippingThreshold,
        enableFreeShipping: dto.enableFreeShipping ?? settings.enableFreeShipping,
        enableDynamicShipping: dto.enableDynamicShipping ?? settings.enableDynamicShipping,
        enableLocalPickup: dto.enableLocalPickup ?? settings.enableLocalPickup,
        defaultCourier: dto.defaultCourier ?? settings.defaultCourier,
        defaultShippingMethod: dto.defaultShippingMethod ?? settings.defaultShippingMethod,
      },
    });

    await this.redisService.del('shipping:settings');

    if (dto.shippingZones) {
      const normalizedZones = this.normalizeShippingZones(dto.shippingZones);
      await this.setShippingZones(normalizedZones);
    }

    return {
      ...await this.getShippingSettings(),
      shippingZones: await this.getShippingZones(),
    };
  }

  async calculateShippingCost(options: {
    municipality?: string;
    province?: string;
    municipalityId?: number;
    provinceId?: number;
    shippingMethod?: string;
    subtotal?: number;
    courierId?: number;
    courierServiceId?: number;
  }) {
    const settings = await this.getShippingSettings();

    if (options.shippingMethod === 'LOCAL_PICKUP' && settings.enableLocalPickup) {
      return 0;
    }

    if (settings.enableFreeShipping && typeof options.subtotal === 'number' && options.subtotal >= settings.freeShippingThreshold) {
      return 0;
    }

    if (!options.municipality && !options.province && !options.municipalityId && !options.provinceId) {
      return settings.defaultShippingCost;
    }

    let zone = null;

    const baseWhere: any = {
      status: 'ACTIVE',
      ...(options.courierId ? { courierId: options.courierId } : {}),
      ...(options.courierServiceId ? { courierServiceId: options.courierServiceId } : {}),
    };

    if (options.municipalityId) {
      zone = await this.prisma.shippingZone.findFirst({
        where: {
          ...baseWhere,
          municipalityId: options.municipalityId,
        },
        orderBy: { priority: 'desc' },
      });
    }

    if (!zone && options.municipality) {
      zone = await this.prisma.shippingZone.findFirst({
        where: {
          ...baseWhere,
          OR: [
            { municipalityRef: { name: { equals: options.municipality?.trim() } } },
            // No `mode: 'insensitive'` — that's a PostgreSQL-only Prisma
            // filter option and throws a validation error against MySQL
            // (this database's provider). MySQL's default collation is
            // already case-insensitive, so plain `contains` is sufficient.
            { municipalityRef: { name: { contains: options.municipality?.trim() } } },
          ],
        },
        orderBy: { priority: 'desc' },
      });
    }

    if (!zone) {
      zone = await this.prisma.shippingZone.findFirst({
        where: {
          ...baseWhere,
          OR: [
            options.municipality
              ? { municipalityRef: { name: { equals: options.municipality?.trim() } } }
              : undefined,
            options.province
              ? { provinceRef: { name: { equals: options.province?.trim() } } }
              : undefined,
            options.provinceId ? { provinceId: options.provinceId } : undefined,
          ].filter(Boolean) as any,
        },
        orderBy: { priority: 'desc' },
      });
    }

    if (zone) {
      return zone.shippingCost;
    }

    return settings.defaultShippingCost;
  }

  private normalizeShippingZones(zones: any[]) {
    return zones.map((zone) => ({
      zoneName: zone.zoneName ?? zone.name ?? 'Unnamed Zone',
      provinceId: zone.provinceId ?? null,
      municipalityId: zone.municipalityId ?? null,
      courierId: zone.courierId ?? null,
      courierServiceId: zone.courierServiceId ?? null,
      courierRateId: zone.courierRateId ?? null,
      shippingMethod: zone.shippingMethod ?? zone.method ?? null,
      shippingCost: Number(zone.shippingCost ?? zone.cost ?? 0),
      estimatedDeliveryDays: zone.estimatedDeliveryDays ?? zone.etaDays ?? null,
      minimumWeight: zone.minimumWeight ?? null,
      maximumWeight: zone.maximumWeight ?? null,
      status: zone.status ?? 'ACTIVE',
      priority: Number(zone.priority ?? 0),
    }));
  }

  private async clearShippingZonesCache() {
    await this.redisService.del('shipping:zones');
  }
}
