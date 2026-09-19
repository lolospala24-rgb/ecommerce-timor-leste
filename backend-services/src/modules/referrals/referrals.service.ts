import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { generateUniqueReferralCode } from '../../common/utils/referral-code.util';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private configService: ConfigService,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private buildReferralLink(code: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://lolospala.com';
    return `${frontendUrl.replace(/\/$/, '')}/register?ref=${code}`;
  }

  // ==========================================================================
  // Code generation — called from AuthService.register() and
  // loginWithGoogle()'s new-user branch, so every user gets one.
  // ==========================================================================

  async generateCodeForNewUser(): Promise<string> {
    return generateUniqueReferralCode(async (candidate) => {
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      return !!existing;
    });
  }

  // Looked up during registration, before the new user exists — a
  // not-found code is a normal, expected outcome (mistyped/expired-looking
  // link), never an error. Self-referral is structurally impossible here:
  // the new user's id doesn't exist yet at the point this runs.
  async findReferrerByCode(rawCode: string): Promise<{ id: number; name: string } | null> {
    const code = this.normalizeCode(rawCode);
    if (!code) return null;
    return this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true },
    });
  }

  // ==========================================================================
  // Registration-time: welcome credit for the referred user.
  // ==========================================================================

  // Runs inside AuthService.register()'s own user-creation transaction.
  // Returns the amount actually credited (0 if the program is disabled) —
  // callers use this to decide whether to send a welcome notification.
  async createReferralForNewUser(
    tx: Prisma.TransactionClient,
    referrerId: number,
    referredUserId: number,
    codeUsed: string,
  ): Promise<number> {
    const settings = await this.settingsService.getSettings();
    if (!settings.referralProgramEnabled) {
      return 0;
    }

    const welcomeCreditAmount = Number(settings.referralWelcomeCredit ?? 0);

    await tx.referral.create({
      data: {
        referrerId,
        referredUserId,
        referralCodeUsed: this.normalizeCode(codeUsed),
        welcomeCreditAmount,
      },
    });

    if (welcomeCreditAmount <= 0) {
      return 0;
    }

    const updated = await tx.user.update({
      where: { id: referredUserId },
      data: { walletCredit: { increment: welcomeCreditAmount } },
      select: { walletCredit: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId: referredUserId,
        type: 'REFERRAL_WELCOME',
        amount: welcomeCreditAmount,
        balanceAfter: updated.walletCredit,
        note: 'Referral welcome credit',
      },
    });

    return welcomeCreditAmount;
  }

  // ==========================================================================
  // Delivery-time: reward the referrer. Called from OrdersService at both
  // transaction sites that can reach DELIVERED (updateStatus and
  // completeDelivery) — see orders.service.ts for why there are exactly two.
  // ==========================================================================

  async rewardReferrerIfEligible(
    tx: Prisma.TransactionClient,
    order: { id: number; customerId: number },
  ): Promise<{ referrerId: number; rewardAmount: number } | null> {
    const referral = await tx.referral.findUnique({
      where: { referredUserId: order.customerId },
      select: { id: true, referrerId: true, status: true },
    });
    if (!referral || referral.status !== 'PENDING') {
      return null;
    }

    const settings = await this.settingsService.getSettings();
    if (!settings.referralProgramEnabled) {
      return null;
    }
    const rewardAmount = Number(settings.referralRewardAmount ?? 0);

    // Atomic idempotency gate — same shape as CouponsService.recordUsage's
    // updateMany + count check. A losing concurrent caller (e.g. two
    // near-simultaneous DELIVERED transitions) always sees count === 0
    // because MySQL/InnoDB re-evaluates `WHERE status = 'PENDING'` under
    // row locking.
    const flip = await tx.referral.updateMany({
      where: { id: referral.id, status: 'PENDING' },
      data: {
        status: 'REWARDED',
        rewardAmount,
        qualifyingOrderId: order.id,
        rewardedAt: new Date(),
      },
    });
    if (flip.count === 0) {
      return null;
    }

    if (rewardAmount <= 0) {
      return { referrerId: referral.referrerId, rewardAmount: 0 };
    }

    const updated = await tx.user.update({
      where: { id: referral.referrerId },
      data: { walletCredit: { increment: rewardAmount } },
      select: { walletCredit: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId: referral.referrerId,
        type: 'REFERRAL_REWARD',
        amount: rewardAmount,
        balanceAfter: updated.walletCredit,
        referralId: referral.id,
        orderId: order.id,
        note: `Referral reward — order #${order.id} delivered`,
      },
    });

    return { referrerId: referral.referrerId, rewardAmount };
  }

  // ==========================================================================
  // Checkout-time: spend wallet credit. Called from OrdersService.create()
  // inside its own checkout transaction, alongside CouponsService.recordUsage.
  // ==========================================================================

  async debitWalletForCheckout(
    tx: Prisma.TransactionClient,
    userId: number,
    amount: number,
    orderId?: number,
  ): Promise<void> {
    if (amount <= 0) return;

    // Same atomic guard as CouponsService.recordUsage — re-validates the
    // balance at write time (not just at the earlier read used to compute
    // the requested amount), so a stale/raced balance throws instead of
    // silently going negative.
    const result = await tx.user.updateMany({
      where: { id: userId, walletCredit: { gte: amount } },
      data: { walletCredit: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new BadRequestException('Wallet credit balance changed — please review your order and try again.');
    }

    const updated = await tx.user.findUnique({ where: { id: userId }, select: { walletCredit: true } });

    await tx.walletTransaction.create({
      data: {
        userId,
        type: 'CHECKOUT_REDEMPTION',
        amount: -amount,
        balanceAfter: updated?.walletCredit ?? 0,
        orderId,
        note: orderId ? `Checkout — order #${orderId}` : 'Checkout',
      },
    });
  }

  // ==========================================================================
  // Customer-facing reads
  // ==========================================================================

  async getSummaryForUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, walletCredit: true },
    });
    const [totalReferred, totalRewarded] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'REWARDED' } }),
    ]);

    return {
      referralCode: user?.referralCode ?? null,
      referralLink: user ? this.buildReferralLink(user.referralCode) : null,
      walletCredit: user?.walletCredit ?? 0,
      totalReferred,
      totalRewarded,
      pendingCount: totalReferred - totalRewarded,
    };
  }

  async listReferralHistoryForUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        include: { referredUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referral.count({ where: { referrerId: userId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Scoped to the current user on either side of the relationship (referrer
  // or referred) — never lets a customer read a referral they're not part of.
  async getReferralDetailForUser(userId: number, referralId: number) {
    const referral = await this.prisma.referral.findFirst({
      where: { id: referralId, OR: [{ referrerId: userId }, { referredUserId: userId }] },
      include: {
        referrer: { select: { id: true, name: true } },
        referredUser: { select: { id: true, name: true } },
        qualifyingOrder: { select: { id: true, orderNumber: true, total: true, status: true, deliveredAt: true } },
      },
    });
    if (!referral) return null;
    return referral;
  }

  async getWalletForUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { walletCredit: true } });
    return { walletCredit: user?.walletCredit ?? 0 };
  }

  async listWalletTransactionsForUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==========================================================================
  // Admin
  // ==========================================================================

  async listForAdmin(params: { page: number; limit: number; status?: 'PENDING' | 'REWARDED' }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referredUser: { select: { id: true, name: true, email: true } },
          qualifyingOrder: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referral.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getForAdminDetail(id: number) {
    return this.prisma.referral.findUnique({
      where: { id },
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        referredUser: { select: { id: true, name: true, email: true } },
        qualifyingOrder: {
          select: { id: true, orderNumber: true, subtotal: true, total: true, paymentMethod: true, status: true, deliveredAt: true },
        },
      },
    });
  }

  async getAdminStats() {
    const [totalReferrals, rewardedReferrals, pendingReferrals, rewardSum] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'REWARDED' } }),
      this.prisma.referral.count({ where: { status: 'PENDING' } }),
      this.prisma.referral.aggregate({ where: { status: 'REWARDED' }, _sum: { rewardAmount: true } }),
    ]);
    return {
      totalReferrals,
      successfulReferrals: rewardedReferrals,
      pendingReferrals,
      rewardsIssued: rewardSum._sum.rewardAmount ?? 0,
    };
  }

  async getReferralSettings() {
    const settings = await this.settingsService.getSettings();
    return {
      referralProgramEnabled: settings.referralProgramEnabled,
      referralWelcomeCredit: settings.referralWelcomeCredit,
      referralRewardAmount: settings.referralRewardAmount,
    };
  }

  async updateReferralSettings(dto: UpdateReferralSettingsDto) {
    await this.settingsService.updateSettings(dto);
    return this.getReferralSettings();
  }
}
