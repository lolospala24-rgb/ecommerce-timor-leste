import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PayoutStatus, LedgerEntryType } from '@prisma/client';
import { ResponseUtil } from '../../common/utils/response.util';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class PayoutsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  private async getSellerOrThrow(userId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async getMyBalance(userId: number) {
    const seller = await this.getSellerOrThrow(userId);
    const balance = await this.prisma.sellerBalance.findUnique({ where: { sellerId: seller.id } });
    return (
      balance ?? {
        sellerId: seller.id,
        pendingAmount: 0,
        availableAmount: 0,
        processingAmount: 0,
        paidOutAmount: 0,
        refundedAmount: 0,
      }
    );
  }

  async getMyLedger(userId: number, pagination: { page: number; limit: number }) {
    const seller = await this.getSellerOrThrow(userId);
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.sellerLedgerEntry.findMany({
        where: { sellerId: seller.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true } } },
      }),
      this.prisma.sellerLedgerEntry.count({ where: { sellerId: seller.id } }),
    ]);

    return ResponseUtil.paginate(entries, total, page, limit);
  }

  /**
   * Reserves `amount` out of the seller's available balance atomically —
   * two concurrent requests racing the same balance can't both succeed for
   * more than what's actually available (conditional updateMany, same
   * pattern as OrdersService.create's stock reservation). The reservation
   * happens now, at request time, not when an admin later approves it —
   * otherwise two pending requests could both later be approved against a
   * balance that only covers one of them.
   */
  async requestPayout(userId: number, amount: number) {
    const seller = await this.getSellerOrThrow(userId);
    return this.createPayout(seller, amount, { status: PayoutStatus.PENDING, note: 'Payout requested' });
  }

  /**
   * Admin creates (and implicitly approves — an admin reviewing a seller's
   * balance and choosing to pay them out has already done the approval
   * step) a payout on the seller's behalf, skipping the seller-initiated
   * request. Same atomic reservation as the self-service path.
   */
  async adminCreatePayout(sellerId: number, amount: number, adminId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    const payout = await this.createPayout(seller, amount, {
      status: PayoutStatus.APPROVED,
      note: 'Payout created by admin',
      processedBy: adminId,
    });

    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_PAYOUT',
        targetType: 'PAYOUT',
        targetId: payout.id,
        details: { sellerId, amount: payout.amount },
      },
    });

    return payout;
  }

  private async createPayout(
    seller: { id: number; bankName: string | null; bankAccountName: string | null; bankAccountNumber: string | null },
    amount: number,
    opts: { status: (typeof PayoutStatus)[keyof typeof PayoutStatus]; note: string; processedBy?: number },
  ) {
    if (!seller.bankName || !seller.bankAccountName || !seller.bankAccountNumber) {
      throw new BadRequestException('This seller has no payout bank details on file yet');
    }

    const settings = await this.settingsService.getSettings();
    const minimum = Number(settings.minimumPayoutAmount ?? 0);
    if (minimum > 0 && amount < minimum) {
      throw new BadRequestException(`Minimum payout amount is $${minimum.toFixed(2)}`);
    }

    const requestedAmount = round2(amount);

    const payout = await this.prisma.$transaction(async (tx) => {
      // available -> processing, atomically guarded (same conditional
      // updateMany pattern as OrdersService.create's stock reservation).
      const reserved = await tx.sellerBalance.updateMany({
        where: { sellerId: seller.id, availableAmount: { gte: requestedAmount } },
        data: {
          availableAmount: { decrement: requestedAmount },
          processingAmount: { increment: requestedAmount },
        },
      });
      if (reserved.count === 0) {
        throw new BadRequestException('Insufficient available balance for this payout amount');
      }

      const balance = await tx.sellerBalance.findUniqueOrThrow({ where: { sellerId: seller.id } });

      const created = await tx.payout.create({
        data: {
          sellerId: seller.id,
          amount: requestedAmount,
          status: opts.status,
          processedBy: opts.processedBy,
          bankName: seller.bankName!,
          bankAccountName: seller.bankAccountName!,
          bankAccountNumber: seller.bankAccountNumber!,
        },
      });

      await tx.sellerLedgerEntry.create({
        data: {
          sellerId: seller.id,
          payoutId: created.id,
          type: LedgerEntryType.PAYOUT,
          availableDelta: round2(-requestedAmount),
          processingDelta: round2(requestedAmount),
          pendingBalanceAfter: round2(balance.pendingAmount),
          availableBalanceAfter: round2(balance.availableAmount),
          processingBalanceAfter: round2(balance.processingAmount),
          paidOutBalanceAfter: round2(balance.paidOutAmount),
          refundedBalanceAfter: round2(balance.refundedAmount),
          note: `${opts.note} — $${requestedAmount.toFixed(2)} moved from available to processing`,
        },
      });

      return created;
    });

    return payout;
  }

  async approvePayout(payoutId: number, adminId: number, adminNote?: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Payout is already ${payout.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.updateMany({
        where: { id: payoutId, status: PayoutStatus.PENDING },
        data: { status: PayoutStatus.APPROVED, processedBy: adminId, adminNote },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Payout is already processed');
      }

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_PAYOUT',
          targetType: 'PAYOUT',
          targetId: payoutId,
          details: { sellerId: payout.sellerId, amount: payout.amount },
        },
      });

      return tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async rejectPayout(payoutId: number, adminId: number, reason: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException(`Payout is already ${payout.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.updateMany({
        where: { id: payoutId, status: payout.status },
        data: { status: PayoutStatus.REJECTED, processedBy: adminId, processedAt: new Date(), adminNote: reason },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Payout is already processed');
      }

      // Return the reserved amount from processing back to available — it
      // was moved into processing at request time (see createPayout), so
      // a rejection (or a payout that failed to actually send) must give
      // it back rather than leaving it stranded in processing.
      const balance = await tx.sellerBalance.update({
        where: { sellerId: payout.sellerId },
        data: {
          availableAmount: { increment: payout.amount },
          processingAmount: { decrement: payout.amount },
        },
      });

      await tx.sellerLedgerEntry.create({
        data: {
          sellerId: payout.sellerId,
          payoutId: payout.id,
          type: LedgerEntryType.ADJUSTMENT,
          availableDelta: round2(payout.amount),
          processingDelta: round2(-payout.amount),
          pendingBalanceAfter: round2(balance.pendingAmount),
          availableBalanceAfter: round2(balance.availableAmount),
          processingBalanceAfter: round2(balance.processingAmount),
          paidOutBalanceAfter: round2(balance.paidOutAmount),
          refundedBalanceAfter: round2(balance.refundedAmount),
          note: `Payout rejected — $${payout.amount.toFixed(2)} returned from processing to available balance. Reason: ${reason}`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_PAYOUT',
          targetType: 'PAYOUT',
          targetId: payoutId,
          details: { sellerId: payout.sellerId, amount: payout.amount, reason },
        },
      });

      return tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async markPaid(payoutId: number, adminId: number) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Only an approved payout can be marked as paid');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.updateMany({
        where: { id: payoutId, status: PayoutStatus.APPROVED },
        data: { status: PayoutStatus.PAID, processedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Payout is already processed');
      }

      const balance = await tx.sellerBalance.update({
        where: { sellerId: payout.sellerId },
        data: {
          processingAmount: { decrement: payout.amount },
          paidOutAmount: { increment: payout.amount },
        },
      });

      await tx.sellerLedgerEntry.create({
        data: {
          sellerId: payout.sellerId,
          payoutId: payout.id,
          type: LedgerEntryType.PAYOUT,
          processingDelta: round2(-payout.amount),
          paidOutDelta: round2(payout.amount),
          pendingBalanceAfter: round2(balance.pendingAmount),
          availableBalanceAfter: round2(balance.availableAmount),
          processingBalanceAfter: round2(balance.processingAmount),
          paidOutBalanceAfter: round2(balance.paidOutAmount),
          refundedBalanceAfter: round2(balance.refundedAmount),
          note: `Payout completed — $${payout.amount.toFixed(2)} moved from processing to paid out`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'MARK_PAYOUT_PAID',
          targetType: 'PAYOUT',
          targetId: payoutId,
          details: { sellerId: payout.sellerId, amount: payout.amount },
        },
      });

      return tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  async findMyPayouts(userId: number, pagination: { page: number; limit: number }) {
    const seller = await this.getSellerOrThrow(userId);
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { sellerId: seller.id },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.payout.count({ where: { sellerId: seller.id } }),
    ]);

    return ResponseUtil.paginate(payouts, total, page, limit);
  }

  async getSellerBalanceForAdmin(sellerId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    const balance = await this.prisma.sellerBalance.findUnique({ where: { sellerId } });
    return (
      balance ?? {
        sellerId,
        pendingAmount: 0,
        availableAmount: 0,
        processingAmount: 0,
        paidOutAmount: 0,
        refundedAmount: 0,
      }
    );
  }

  async getSellerLedgerForAdmin(sellerId: number, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.prisma.sellerLedgerEntry.findMany({
        where: { sellerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true } } },
      }),
      this.prisma.sellerLedgerEntry.count({ where: { sellerId } }),
    ]);
    return ResponseUtil.paginate(entries, total, page, limit);
  }

  async findAllForAdmin(filters: { status?: PayoutStatus; page: number; limit: number }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: { seller: { select: { storeName: true } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return ResponseUtil.paginate(payouts, total, page, limit);
  }

  async findOne(id: number, userId: number, userRole: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: { seller: { select: { storeName: true, userId: true } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    if (userRole === 'SELLER' && payout.seller.userId !== userId) {
      throw new ForbiddenException('You can only view your own payouts');
    }

    return payout;
  }
}
