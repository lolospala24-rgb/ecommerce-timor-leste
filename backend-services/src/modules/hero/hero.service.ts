import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateHeroBannerDto } from './dto/create-hero-banner.dto';
import { UpdateHeroBannerDto } from './dto/update-hero-banner.dto';
import { ReorderHeroBannersDto } from './dto/reorder-hero-banners.dto';

const HERO_CACHE_KEY = 'hero:banners:resolved';
const HERO_CACHE_TTL = 300;

@Injectable()
export class HeroService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ==========================================================================
  // Public: active banners within their schedule window, position-ordered.
  // ==========================================================================
  async getActiveBanners() {
    const cached = await this.redisService.get(HERO_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const banners = await this.prisma.heroBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { position: 'asc' },
    });

    await this.redisService.set(HERO_CACHE_KEY, JSON.stringify(banners), HERO_CACHE_TTL);
    return banners;
  }

  // ==========================================================================
  // Admin: CRUD + reorder
  // ==========================================================================
  async listForAdmin() {
    return this.prisma.heroBanner.findMany({ orderBy: { position: 'asc' } });
  }

  async getForAdmin(id: number) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Hero banner ${id} not found`);
    return banner;
  }

  async create(dto: CreateHeroBannerDto) {
    const banner = await this.prisma.heroBanner.create({
      data: {
        badge: dto.badge,
        title: dto.title,
        subtitle: dto.subtitle,
        buttonText: dto.buttonText,
        buttonUrl: dto.buttonUrl,
        desktopImage: dto.desktopImage,
        mobileImage: dto.mobileImage,
        position: dto.position ?? (await this.getNextPosition()),
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    await this.invalidateCache();
    return banner;
  }

  async update(id: number, dto: UpdateHeroBannerDto) {
    const existing = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Hero banner ${id} not found`);

    const banner = await this.prisma.heroBanner.update({
      where: { id },
      data: {
        badge: dto.badge,
        title: dto.title,
        subtitle: dto.subtitle,
        buttonText: dto.buttonText,
        buttonUrl: dto.buttonUrl,
        desktopImage: dto.desktopImage,
        mobileImage: dto.mobileImage,
        position: dto.position,
        isActive: dto.isActive,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      },
    });

    await this.invalidateCache();
    return banner;
  }

  async remove(id: number) {
    const existing = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Hero banner ${id} not found`);

    await this.prisma.heroBanner.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true };
  }

  async reorder(dto: ReorderHeroBannersDto) {
    await this.prisma.$transaction(
      dto.banners.map((b) =>
        this.prisma.heroBanner.update({ where: { id: b.id }, data: { position: b.position } }),
      ),
    );
    await this.invalidateCache();
    return this.listForAdmin();
  }

  // ==========================================================================
  // Image upload — desktop and mobile share the same endpoint (type param
  // picks the Cloudinary transform); returns the URL for the admin form to
  // attach via create/update, same pattern as seller store logo/banner.
  // ==========================================================================
  async uploadImage(file: Express.Multer.File, type: 'desktop' | 'mobile') {
    const transformation =
      type === 'desktop'
        ? { width: 800, height: 600, crop: 'fill' as const }
        : { width: 800, height: 450, crop: 'fill' as const };

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: `ecommerce-timor/hero/${type}`,
      transformation,
    });

    return result.secure_url;
  }

  private async getNextPosition(): Promise<number> {
    const last = await this.prisma.heroBanner.findFirst({ orderBy: { position: 'desc' } });
    return (last?.position ?? -1) + 1;
  }

  private async invalidateCache() {
    await this.redisService.del(HERO_CACHE_KEY);
  }
}
