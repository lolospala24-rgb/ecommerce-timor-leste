import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QuickMenuIconType, QuickMenuLinkType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateQuickMenuItemDto } from './dto/create-quick-menu-item.dto';
import { UpdateQuickMenuItemDto } from './dto/update-quick-menu-item.dto';
import { ReorderQuickMenuDto } from './dto/reorder-quick-menu.dto';
import { sanitizeSvg } from '../../common/utils/svg-sanitizer.util';

const QUICK_MENU_CACHE_KEY = 'quick-menu:active';
const QUICK_MENU_CACHE_TTL = 300;

@Injectable()
export class QuickMenuService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ==========================================================================
  // Public: active items within their schedule window, order-ordered. Same
  // cache-then-invalidate pattern as HeroService.getActiveBanners().
  // ==========================================================================
  async getActiveItems() {
    const cached = await this.redisService.get(QUICK_MENU_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const items = await this.prisma.quickMenuItem.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { displayOrder: 'asc' },
    });

    await this.redisService.set(QUICK_MENU_CACHE_KEY, JSON.stringify(items), QUICK_MENU_CACHE_TTL);
    return items;
  }

  // ==========================================================================
  // Admin: CRUD + reorder
  // ==========================================================================
  async listForAdmin() {
    return this.prisma.quickMenuItem.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async getForAdmin(id: number) {
    const item = await this.prisma.quickMenuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Quick Menu item ${id} not found`);
    return item;
  }

  async create(dto: CreateQuickMenuItemDto) {
    const iconType = dto.iconType ?? QuickMenuIconType.LIBRARY;
    const linkType = dto.linkType ?? QuickMenuLinkType.INTERNAL;
    this.assertIconShape(iconType, dto.iconKey, dto.iconUrl);
    this.assertLinkShape(linkType, dto.link);

    const item = await this.prisma.quickMenuItem.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        iconType,
        iconKey: iconType === QuickMenuIconType.LIBRARY ? dto.iconKey : null,
        iconUrl: iconType === QuickMenuIconType.UPLOAD ? dto.iconUrl : null,
        linkType,
        link: dto.link,
        displayOrder: dto.displayOrder ?? (await this.getNextDisplayOrder()),
        isActive: dto.isActive ?? true,
        badge: dto.badge,
        openInNewTab: dto.openInNewTab ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    await this.invalidateCache();
    return item;
  }

  async update(id: number, dto: UpdateQuickMenuItemDto) {
    const existing = await this.prisma.quickMenuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Quick Menu item ${id} not found`);

    // Resolve against the post-update values (existing row's, unless this
    // request overrides them) — the same "what will actually be true after
    // this write" check create() does, so e.g. switching iconType from
    // UPLOAD to LIBRARY without also sending a new iconKey is still caught.
    const nextIconType = dto.iconType ?? existing.iconType;
    const nextLinkType = dto.linkType ?? existing.linkType;
    const nextIconKey = dto.iconKey !== undefined ? dto.iconKey : existing.iconKey;
    const nextIconUrl = dto.iconUrl !== undefined ? dto.iconUrl : existing.iconUrl;
    const nextLink = dto.link ?? existing.link;

    this.assertIconShape(nextIconType, nextIconKey ?? undefined, nextIconUrl ?? undefined);
    this.assertLinkShape(nextLinkType, nextLink);

    const item = await this.prisma.quickMenuItem.update({
      where: { id },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        iconType: dto.iconType,
        iconKey: nextIconType === QuickMenuIconType.LIBRARY ? nextIconKey : dto.iconType !== undefined ? null : undefined,
        iconUrl: nextIconType === QuickMenuIconType.UPLOAD ? nextIconUrl : dto.iconType !== undefined ? null : undefined,
        linkType: dto.linkType,
        link: dto.link,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
        badge: dto.badge,
        openInNewTab: dto.openInNewTab,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      },
    });

    await this.invalidateCache();
    return item;
  }

  async remove(id: number) {
    const existing = await this.prisma.quickMenuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Quick Menu item ${id} not found`);

    // Data-safety: only this one row is ever touched — no cascading delete
    // of anything else, and an uploaded icon's Cloudinary asset is left in
    // place (see uploadIcon()'s doc-comment on why cleanup is deliberately
    // not automatic here).
    await this.prisma.quickMenuItem.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true };
  }

  async reorder(dto: ReorderQuickMenuDto) {
    await this.prisma.$transaction(
      dto.items.map((entry) =>
        this.prisma.quickMenuItem.update({
          where: { id: entry.id },
          data: { displayOrder: entry.displayOrder },
        }),
      ),
    );
    await this.invalidateCache();
    return this.listForAdmin();
  }

  // ==========================================================================
  // Icon upload — PNG/WEBP go through the normal, already-hardened
  // CloudinaryService.uploadFile() (magic-byte checked). SVG can't go
  // through that path (file-type doesn't sniff SVG), so it's sanitized here
  // first and uploaded via uploadRaw() instead. Either way this never
  // deletes a previous icon itself — see the doc-comment above the
  // controller endpoint for why that's a deliberate, separate step.
  // ==========================================================================
  async uploadIcon(file: Express.Multer.File): Promise<string> {
    const isSvg = file.mimetype === 'image/svg+xml' || /\.svg$/i.test(file.originalname);

    if (isSvg) {
      const sanitized = sanitizeSvg(file.buffer.toString('utf-8'));
      const sanitizedFile: Express.Multer.File = {
        ...file,
        buffer: Buffer.from(sanitized, 'utf-8'),
      };
      const result = await this.cloudinaryService.uploadRaw(sanitizedFile, {
        folder: 'ecommerce-timor/quick-menu-icons',
        resource_type: 'image',
      });
      return result.secure_url;
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'ecommerce-timor/quick-menu-icons',
      transformation: { width: 128, height: 128, crop: 'fit' },
    });
    return result.secure_url;
  }

  private assertIconShape(iconType: QuickMenuIconType, iconKey?: string, iconUrl?: string) {
    if (iconType === QuickMenuIconType.LIBRARY && !iconKey) {
      throw new BadRequestException('iconKey is required when iconType is LIBRARY');
    }
    if (iconType === QuickMenuIconType.UPLOAD && !iconUrl) {
      throw new BadRequestException('iconUrl is required when iconType is UPLOAD');
    }
  }

  private assertLinkShape(linkType: QuickMenuLinkType, link: string) {
    if (linkType === QuickMenuLinkType.INTERNAL) {
      if (!link.startsWith('/')) {
        throw new BadRequestException('Internal link must start with "/"');
      }
      return;
    }
    try {
      const url = new URL(link);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new BadRequestException('External link must be a valid http(s) URL');
    }
  }

  private async getNextDisplayOrder(): Promise<number> {
    const last = await this.prisma.quickMenuItem.findFirst({ orderBy: { displayOrder: 'desc' } });
    return (last?.displayOrder ?? -1) + 1;
  }

  private async invalidateCache() {
    await this.redisService.del(QUICK_MENU_CACHE_KEY);
  }
}
