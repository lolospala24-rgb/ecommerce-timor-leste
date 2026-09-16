import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notifications.constants';
import { generateSlugBase } from '../../common/utils/slug.util';
import { CreateProductTypeRequestDto } from './dto/create-product-type-request.dto';
import { ApproveProductTypeRequestDto } from './dto/approve-product-type-request.dto';
import { ResponseUtil } from '../../common/utils/response.util';

@Injectable()
export class ProductTypeRequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private async requireSeller(userId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found for this account');
    return seller;
  }

  async create(userId: number, dto: CreateProductTypeRequestDto) {
    const seller = await this.requireSeller(userId);

    return this.prisma.productTypeRequest.create({
      data: {
        sellerId: seller.id,
        name: dto.name.trim(),
        nameTetum: dto.nameTetum?.trim() || undefined,
        description: dto.description?.trim() || undefined,
        fields: dto.fields ?? {},
        specFields: dto.specFields ?? {},
      },
    });
  }

  async findMyRequests(userId: number, filters: { page: number; limit: number }) {
    const seller = await this.requireSeller(userId);
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.productTypeRequest.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { resultingType: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.productTypeRequest.count({ where: { sellerId: seller.id } }),
    ]);

    return ResponseUtil.paginate(data, total, page, limit);
  }

  // Admin-only listing — every seller's requests, since reviewing them is
  // the whole point of this queue (unlike products/orders, which are
  // always scoped to one seller).
  async findAll(filters: { page: number; limit: number; status?: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.productTypeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          seller: { select: { id: true, storeName: true } },
          resultingType: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.productTypeRequest.count({ where }),
    ]);

    return ResponseUtil.paginate(data, total, page, limit);
  }

  private async findPendingOrThrow(id: number) {
    const request = await this.prisma.productTypeRequest.findUnique({
      where: { id },
      include: { seller: { include: { user: true } } },
    });
    if (!request) throw new NotFoundException('Product type request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException('This request has already been reviewed');
    }
    return request;
  }

  async approve(id: number, adminId: number, dto: ApproveProductTypeRequestDto) {
    const request = await this.findPendingOrThrow(id);

    const name = (dto.name ?? request.name).trim();
    const slug = generateSlugBase(name);
    const existingType = await this.prisma.productType.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existingType) {
      throw new ConflictException(
        `A product type named "${existingType.name}" already exists — reject this request and ask the seller to use it instead, or edit the name before approving.`,
      );
    }

    // Interactive transaction: the request update needs the new type's id,
    // which only exists after the create step runs — an array-form
    // transaction can't reference a prior step's result, so both writes
    // must happen inside one callback to stay atomic (never leave an
    // orphaned ProductType with no request marked APPROVED, or vice versa).
    const { type, request: finalRequest } = await this.prisma.$transaction(async (tx) => {
      const type = await tx.productType.create({
        data: {
          name,
          nameTetum: dto.nameTetum ?? request.nameTetum,
          description: dto.description ?? request.description,
          slug,
          fields: (dto.fields ?? request.fields) as object,
          specFields: (dto.specFields ?? request.specFields) as object,
        },
      });

      const updatedRequest = await tx.productTypeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resultingTypeId: type.id,
        },
      });

      return { type, request: updatedRequest };
    });

    await this.notificationsService
      .sendNotification({
        userId: request.seller.userId,
        title: 'Product type approved',
        message: `Your requested product type "${type.name}" was approved and is now available to use.`,
        type: NotificationEvent.PRODUCT_TYPE_REQUEST_APPROVED,
        entityType: 'ProductType',
        entityId: type.id,
        actorId: adminId,
      })
      .catch((err) => console.error('Failed to send type-request-approved notification:', err));

    return { type, request: finalRequest };
  }

  async reject(id: number, adminId: number, reason: string) {
    const request = await this.findPendingOrThrow(id);

    const updated = await this.prisma.productTypeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.notificationsService
      .sendNotification({
        userId: request.seller.userId,
        title: 'Product type request rejected',
        message: `Your requested product type "${request.name}" was not approved: ${reason}`,
        type: NotificationEvent.PRODUCT_TYPE_REQUEST_REJECTED,
        entityType: 'ProductTypeRequest',
        entityId: id,
        actorId: adminId,
      })
      .catch((err) => console.error('Failed to send type-request-rejected notification:', err));

    return updated;
  }
}
