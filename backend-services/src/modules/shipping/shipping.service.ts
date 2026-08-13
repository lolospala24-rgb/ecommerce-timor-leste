import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
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
            select: { id: true, name: true, isActive: true },
          },
          courier: {
            select: { id: true, name: true, status: true },
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
    // Check + write happen inside one transaction to close most of the
    // race window between two concurrent admin requests creating the same
    // duplicate rate. This narrows but doesn't fully eliminate the race —
    // MySQL has no partial/filtered unique index, so the real backstop is
    // the generated-column unique index added in the
    // enforce_active_shipping_rate_uniqueness migration (DB-level, catches
    // what this app-level check might still miss under true concurrency).
    const created = await this.prisma.$transaction(async (tx) => {
      await this.assertNoDuplicateRate(dto.courierId, dto.municipalityId, dto.shippingMethod, undefined, tx);
      return tx.shippingZone.create({
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
        include: { courier: true, municipalityRef: true },
      });
    });

    await this.clearShippingZonesCache();
    return created;
  }

  async updateShippingZone(id: number, dto: UpdateShippingZoneDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const zone = await tx.shippingZone.findUnique({ where: { id } });
      if (!zone) {
        throw new NotFoundException(`Shipping rate with ID ${id} not found`);
      }

      await this.assertNoDuplicateRate(
        dto.courierId ?? zone.courierId ?? undefined,
        dto.municipalityId ?? zone.municipalityId ?? undefined,
        dto.shippingMethod ?? zone.shippingMethod ?? undefined,
        id,
        tx,
      );

      return tx.shippingZone.update({
        where: { id },
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
          status: dto.status,
          priority: dto.priority,
        },
        include: { courier: true, municipalityRef: true },
      });
    });

    await this.clearShippingZonesCache();
    return updated;
  }

  async toggleShippingZoneStatus(id: number) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`Shipping rate with ID ${id} not found`);
    }

    const updated = await this.prisma.shippingZone.update({
      where: { id },
      data: { status: zone.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      include: { courier: true, municipalityRef: true },
    });

    await this.clearShippingZonesCache();
    return updated;
  }

  async removeShippingZone(id: number) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`Shipping rate with ID ${id} not found`);
    }

    const referenced = await this.prisma.order.count({ where: { shippingZoneId: id } });
    if (referenced > 0) {
      throw new BadRequestException(
        `Cannot delete "${zone.zoneName}" — it is referenced by ${referenced} existing order(s). Deactivate it instead.`,
      );
    }

    await this.prisma.shippingZone.delete({ where: { id } });
    await this.clearShippingZonesCache();
    return { success: true };
  }

  /** Prevents two active rates from covering the exact same courier + municipality + service combination. */
  private async assertNoDuplicateRate(
    courierId: number | undefined,
    municipalityId: number | undefined,
    shippingMethod: string | null | undefined,
    excludeId?: number,
    tx?: Prisma.TransactionClient,
  ) {
    if (!courierId || !municipalityId) return;

    const client = tx ?? this.prisma;
    const existing = await client.shippingZone.findFirst({
      where: {
        courierId,
        municipalityId,
        shippingMethod: shippingMethod ?? null,
        status: 'ACTIVE',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `An active shipping rate already exists for this courier + municipality${shippingMethod ? ` + ${shippingMethod}` : ''} combination.`,
      );
    }
  }

  /**
   * The admin Shipping Settings form saves the whole zone list as one bulk
   * payload rather than per-row CRUD calls. This used to hard-delete every
   * zone and recreate them with fresh autoincrement IDs on every save,
   * which orphans (or FK-violates) any `Order.shippingZoneId` pointing at a
   * zone that still exists conceptually but got a new ID. Instead: update
   * zones whose real `id` is still present in the payload, create zones
   * with no matching id, and for zones removed from the payload — delete
   * them only if no order references them, otherwise soft-deactivate
   * (status: INACTIVE) so historical orders keep a valid FK.
   */
  async setShippingZones(zones: CreateShippingZoneDto[]) {
    const zoneData = (zone: CreateShippingZoneDto) => ({
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
    });

    await this.prisma.$transaction(async (prisma) => {
      const existingZones = await prisma.shippingZone.findMany({ select: { id: true } });
      const existingIds = new Set(existingZones.map((z) => z.id));
      const incomingIds = new Set(zones.filter((z) => z.id != null).map((z) => z.id as number));

      const zoneIdsToRemove = [...existingIds].filter((id) => !incomingIds.has(id));

      if (zoneIdsToRemove.length > 0) {
        const referenced = await prisma.order.findMany({
          where: { shippingZoneId: { in: zoneIdsToRemove } },
          select: { shippingZoneId: true },
          distinct: ['shippingZoneId'],
        });
        const referencedIds = new Set(referenced.map((o) => o.shippingZoneId as number));

        const safeToDelete = zoneIdsToRemove.filter((id) => !referencedIds.has(id));
        const toDeactivate = zoneIdsToRemove.filter((id) => referencedIds.has(id));

        if (safeToDelete.length > 0) {
          await prisma.shippingZone.deleteMany({ where: { id: { in: safeToDelete } } });
        }
        if (toDeactivate.length > 0) {
          await prisma.shippingZone.updateMany({ where: { id: { in: toDeactivate } }, data: { status: 'INACTIVE' } });
        }
      }

      for (const zone of zones) {
        if (zone.id != null && existingIds.has(zone.id)) {
          await prisma.shippingZone.update({ where: { id: zone.id }, data: zoneData(zone) });
        } else {
          await prisma.shippingZone.create({ data: zoneData(zone) });
        }
      }
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
  }): Promise<{ shippingCost: number; shippingZoneId: number | null; courierName: string | null }> {
    const settings = await this.getShippingSettings();

    if (options.shippingMethod === 'LOCAL_PICKUP' && settings.enableLocalPickup) {
      return { shippingCost: 0, shippingZoneId: null, courierName: null };
    }

    if (settings.enableFreeShipping && typeof options.subtotal === 'number' && options.subtotal >= settings.freeShippingThreshold) {
      return { shippingCost: 0, shippingZoneId: null, courierName: null };
    }

    if (!options.municipality && !options.province && !options.municipalityId && !options.provinceId) {
      return { shippingCost: settings.defaultShippingCost, shippingZoneId: null, courierName: null };
    }

    let zone: any = null;

    const baseWhere: any = {
      status: 'ACTIVE',
      // A rate tied to a courier/municipality is only valid while that
      // courier/municipality is active — deactivating either must pull the
      // rate out of checkout immediately, without touching the rate itself.
      // Nested under AND (not OR) so it composes safely with each tier's
      // own OR-based municipality/province matching below, which would
      // otherwise silently overwrite a top-level OR key on spread.
      AND: [
        { OR: [{ courierId: null }, { courier: { status: 'ACTIVE' } }] },
        { OR: [{ municipalityId: null }, { municipalityRef: { isActive: true } }] },
      ],
      ...(options.courierId ? { courierId: options.courierId } : {}),
      ...(options.courierServiceId ? { courierServiceId: options.courierServiceId } : {}),
    };

    if (options.municipalityId) {
      zone = await this.prisma.shippingZone.findFirst({
        where: {
          ...baseWhere,
          municipalityId: options.municipalityId,
        },
        include: { courier: true },
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
        include: { courier: true },
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
        include: { courier: true },
        orderBy: { priority: 'desc' },
      });
    }

    if (zone) {
      return { shippingCost: zone.shippingCost, shippingZoneId: zone.id, courierName: zone.courier?.name ?? null };
    }

    return { shippingCost: settings.defaultShippingCost, shippingZoneId: null, courierName: null };
  }

  /**
   * The customer-facing "choose your shipping" list for a given address.
   * Unlike calculateShippingCost() (which picks the single best-matching
   * rate to charge), this returns every active rate that legitimately
   * covers the municipality — the actual courier choices the checkout page
   * should render, resolved by the backend rather than filtered client-side.
   */
  async getAvailableShippingOptions(options: { municipalityId?: number; provinceId?: number }) {
    if (!options.municipalityId && !options.provinceId) {
      return [];
    }

    if (options.municipalityId) {
      const municipality = await this.prisma.municipality.findUnique({ where: { id: options.municipalityId } });
      if (!municipality || !municipality.isActive) {
        return [];
      }
    }

    const zones = await this.prisma.shippingZone.findMany({
      where: {
        status: 'ACTIVE',
        // A rate tied to a courier/municipality only counts while that
        // courier/municipality is active — see the identical comment in
        // calculateShippingCost().
        AND: [
          { OR: [{ courierId: null }, { courier: { status: 'ACTIVE' } }] },
          { OR: [{ municipalityId: null }, { municipalityRef: { isActive: true } }] },
        ],
        OR: [
          options.municipalityId ? { municipalityId: options.municipalityId } : undefined,
          // A zone scoped to a province only (no specific municipality) is a
          // broader fallback that still legitimately covers this address.
          { municipalityId: null, provinceId: options.provinceId ?? undefined },
        ].filter(Boolean) as any,
      },
      include: { courier: true },
      orderBy: [{ priority: 'desc' }, { shippingCost: 'asc' }],
    });

    // A municipality-specific rate always beats a province-wide fallback
    // for the same courier — don't show both as separate choices.
    const seenCouriers = new Set<number | null>();
    const specific = zones.filter((z) => z.municipalityId === options.municipalityId);
    const fallback = zones.filter((z) => z.municipalityId == null);
    const deduped = [...specific, ...fallback].filter((zone) => {
      if (seenCouriers.has(zone.courierId)) return false;
      seenCouriers.add(zone.courierId);
      return true;
    });

    return deduped.map((zone) => ({
      shippingZoneId: zone.id,
      zoneName: zone.zoneName,
      courierId: zone.courierId,
      courierName: zone.courier?.name ?? null,
      shippingMethod: zone.shippingMethod,
      shippingCost: zone.shippingCost,
      estimatedDeliveryDays: zone.estimatedDeliveryDays,
    }));
  }

  async getShippingDashboardStats() {
    const [
      totalCouriers,
      activeCouriers,
      totalMunicipalities,
      activeMunicipalities,
      totalShippingZones,
      activeShippingZones,
      coveredMunicipalities,
    ] = await Promise.all([
      this.prisma.courier.count(),
      this.prisma.courier.count({ where: { status: 'ACTIVE' } }),
      this.prisma.municipality.count(),
      this.prisma.municipality.count({ where: { isActive: true } }),
      this.prisma.shippingZone.count(),
      this.prisma.shippingZone.count({ where: { status: 'ACTIVE' } }),
      this.prisma.shippingZone.findMany({
        where: { status: 'ACTIVE', municipalityId: { not: null } },
        select: { municipalityId: true },
        distinct: ['municipalityId'],
      }),
    ]);

    return {
      totalCouriers,
      activeCouriers,
      totalMunicipalities,
      activeMunicipalities,
      totalShippingZones,
      activeShippingZones,
      coveredMunicipalities: coveredMunicipalities.length,
      uncoveredMunicipalities: Math.max(activeMunicipalities - coveredMunicipalities.length, 0),
    };
  }

  private normalizeShippingZones(zones: any[]) {
    return zones.map((zone) => ({
      // Only pass through an id that's a real DB row id. The admin UI
      // assigns `Date.now()`-based placeholder ids to zones added in the
      // current session before saving — those must be treated as new rows,
      // not mistaken for an id to update.
      id: typeof zone.id === 'number' && zone.id < 1_000_000_000 ? zone.id : undefined,
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
