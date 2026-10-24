import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notifications.constants';
import { generateUniqueReferralCode } from '../../common/utils/referral-code.util';
import { diliMonthKey } from '../../common/utils/timezone.util';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type PayoutOutcome =
  | { kind: 'SKIPPED' }
  | { kind: 'CAPPED' }
  | {
      kind: 'REWARDED';
      referrerId: number;
      rewardAmount: number;
      qualifyingOrderId: number | null;
    };

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
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
  // Registration-time: create the Referral row only. The referred user's
  // welcome credit is NO LONGER granted here — it's deferred to
  // payoutDueReferrals(), credited alongside (or ahead of, if the referrer
  // ends up CAPPED) the referrer's own reward once the hold period clears.
  // Phase-1 change: this used to credit the wallet immediately in the same
  // transaction (see git history) — kept doing only the Referral.create()
  // half of that so a pre-existing qualifying flow (registration) still
  // snapshots welcomeCreditAmount at the settings value in effect right now.
  // ==========================================================================

  // Runs inside AuthService.register()'s own user-creation transaction.
  // Returns the amount PROMISED (0 if the program is disabled) — callers
  // use this for a "you'll receive $X" welcome notification, not a
  // "you've received" one, since nothing is credited yet.
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

    return welcomeCreditAmount;
  }

  // ==========================================================================
  // Delivery-time: mark QUALIFIED (not yet rewarded). Called from
  // OrdersService at both transaction sites that can reach DELIVERED
  // (updateStatus and completeDelivery) — see orders.service.ts for why
  // there are exactly two. No notification fires here — nothing has been
  // credited, and the referrer isn't told "maybe" results.
  // ==========================================================================

  async qualifyReferralIfEligible(
    tx: Prisma.TransactionClient,
    order: { id: number; customerId: number; subtotal: number; walletCreditUsed: number },
  ): Promise<void> {
    const referral = await tx.referral.findUnique({
      where: { referredUserId: order.customerId },
      select: { id: true, status: true },
    });
    if (!referral || referral.status !== ReferralStatus.PENDING) {
      return;
    }

    const settings = await this.settingsService.getSettings();
    if (!settings.referralProgramEnabled) {
      return;
    }

    // Deliberately subtotal minus wallet credit actually applied, NOT
    // order.total — shipping/tax/service fee never count toward the
    // qualifying amount, and wallet credit the customer already spent on
    // this order isn't "new" money either.
    const qualifyingAmount = round2(order.subtotal - order.walletCreditUsed);
    const minAmount = Number(settings.referralMinQualifyingAmount ?? 0);
    if (qualifyingAmount < minAmount) {
      return;
    }

    // Same atomic idempotency gate as before — a losing concurrent caller
    // (two near-simultaneous DELIVERED transitions) sees count === 0.
    await tx.referral.updateMany({
      where: { id: referral.id, status: ReferralStatus.PENDING },
      data: {
        status: ReferralStatus.QUALIFIED,
        qualifyingOrderId: order.id,
        qualifiedAt: new Date(),
      },
    });
  }

  // ==========================================================================
  // ReferralPayoutJob: pays out every referral whose hold period has
  // cleared (or retries a CAPPED one for the new month). Processed one at
  // a time — not Promise.all — so the monthly-cap reservation below can't
  // race within a single run; different referrers still process
  // independently across ticks since the cap is scoped per
  // referrer+month (see ReferralMonthlyRewardCount).
  // ==========================================================================

  async payoutDueReferrals(): Promise<{ processed: number; rewarded: number; capped: number; failed: number }> {
    const settings = await this.settingsService.getSettings();
    const holdDays = Number(settings.referralHoldDays ?? 7);
    const holdCutoff = new Date();
    holdCutoff.setDate(holdCutoff.getDate() - holdDays);

    const candidates = await this.prisma.referral.findMany({
      where: {
        OR: [
          { status: ReferralStatus.QUALIFIED, qualifiedAt: { lte: holdCutoff } },
          { status: ReferralStatus.CAPPED },
        ],
      },
      orderBy: { qualifiedAt: 'asc' },
      select: { id: true },
    });

    let rewarded = 0;
    let capped = 0;
    let failed = 0;

    for (const { id } of candidates) {
      try {
        const outcome = await this.payoutOne(id, settings);
        if (outcome.kind === 'REWARDED') {
          rewarded++;
          await this.notifyRewarded(outcome);
        } else if (outcome.kind === 'CAPPED') {
          capped++;
        }
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to pay out referral ${id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return { processed: candidates.length, rewarded, capped, failed };
  }

  private async payoutOne(
    referralId: number,
    settings: { referralRewardAmount: unknown; referralMonthlyCap: unknown },
  ): Promise<PayoutOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({ where: { id: referralId } });
      if (!referral || (referral.status !== ReferralStatus.QUALIFIED && referral.status !== ReferralStatus.CAPPED)) {
        return { kind: 'SKIPPED' };
      }

      // Friend's welcome credit is granted the FIRST time this referral is
      // processed here, regardless of whether the referrer ends up
      // REWARDED or CAPPED below — see ReferralStatus.CAPPED doc-comment
      // in schema.prisma. welcomeCreditGrantedAt also doubles as the
      // double-grant guard for referrals that already got this credit at
      // registration under the pre-Phase-1 flow (backfilled by migration).
      if (!referral.welcomeCreditGrantedAt && referral.welcomeCreditAmount > 0) {
        const updatedFriend = await tx.user.update({
          where: { id: referral.referredUserId },
          data: { walletCredit: { increment: referral.welcomeCreditAmount } },
          select: { walletCredit: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: referral.referredUserId,
            type: 'REFERRAL_WELCOME',
            amount: referral.welcomeCreditAmount,
            balanceAfter: updatedFriend.walletCredit,
            referralId: referral.id,
            note: 'Referral welcome credit',
          },
        });
      }
      if (!referral.welcomeCreditGrantedAt) {
        await tx.referral.update({ where: { id: referral.id }, data: { welcomeCreditGrantedAt: new Date() } });
      }

      // Atomic conditional reservation — same idiom as the status flips
      // below, just against a per-(referrer, month) counter instead of a
      // status column. A concurrent payout for the SAME referrer racing
      // this exact referral would see count unchanged until this
      // transaction commits (InnoDB row lock on the counter row), so two
      // overlapping ticks can never both reserve past the cap.
      const monthKey = diliMonthKey();
      await tx.referralMonthlyRewardCount.upsert({
        where: { referrerId_monthKey: { referrerId: referral.referrerId, monthKey } },
        create: { referrerId: referral.referrerId, monthKey, count: 0 },
        update: {},
      });

      const cap = Number(settings.referralMonthlyCap ?? 20);
      const reserved = await tx.referralMonthlyRewardCount.updateMany({
        where: { referrerId: referral.referrerId, monthKey, count: { lt: cap } },
        data: { count: { increment: 1 } },
      });

      if (reserved.count === 0) {
        if (referral.status !== ReferralStatus.CAPPED) {
          await tx.referral.updateMany({
            where: { id: referral.id, status: ReferralStatus.QUALIFIED },
            data: { status: ReferralStatus.CAPPED },
          });
        }
        return { kind: 'CAPPED' };
      }

      const rewardAmount = Number(settings.referralRewardAmount ?? 0);
      const flip = await tx.referral.updateMany({
        where: { id: referral.id, status: { in: [ReferralStatus.QUALIFIED, ReferralStatus.CAPPED] } },
        data: { status: ReferralStatus.REWARDED, rewardAmount, rewardedAt: new Date() },
      });
      if (flip.count === 0) {
        // Lost a race to another concurrent payout of the exact same
        // referral — the monthly slot we just reserved is "spent" on
        // nothing, a known, extremely unlikely edge case (would require
        // two overlapping job ticks processing the same referral id at
        // once; payoutDueReferrals() itself never does this within one
        // run). Logged rather than silently dropped.
        this.logger.warn(`Referral ${referral.id} lost its reward race after reserving a monthly slot`);
        return { kind: 'SKIPPED' };
      }

      if (rewardAmount > 0) {
        const updatedReferrer = await tx.user.update({
          where: { id: referral.referrerId },
          data: { walletCredit: { increment: rewardAmount } },
          select: { walletCredit: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: referral.referrerId,
            type: 'REFERRAL_REWARD',
            amount: rewardAmount,
            balanceAfter: updatedReferrer.walletCredit,
            referralId: referral.id,
            orderId: referral.qualifyingOrderId,
            note: `Referral reward — order #${referral.qualifyingOrderId} held past the refund window with no refund`,
          },
        });
      }

      return {
        kind: 'REWARDED',
        referrerId: referral.referrerId,
        rewardAmount,
        qualifyingOrderId: referral.qualifyingOrderId,
      };
    });
  }

  private async notifyRewarded(outcome: Extract<PayoutOutcome, { kind: 'REWARDED' }>): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        userId: outcome.referrerId,
        title: 'You earned a referral reward!',
        message: `Your referred friend's first order held up — $${outcome.rewardAmount.toFixed(2)} wallet credit has been added to your account.`,
        type: NotificationEvent.REFERRAL_REWARD_EARNED,
        sendEmail: false,
      });
    } catch (err) {
      this.logger.error(`Failed to send referral reward notification: ${err}`);
    }
  }

  // ==========================================================================
  // Refund-time (full refunds only — see RefundsService.approveRefund):
  // either un-qualify a referral still waiting out its hold period, or
  // claw back one that already paid out. Returns data for the caller to
  // notify with AFTER its own transaction commits — this never sends
  // notifications itself, matching the rest of this service.
  // ==========================================================================

  async reverseReferralForRefundedOrder(
    tx: Prisma.TransactionClient,
    orderId: number,
  ): Promise<
    | null
    | { kind: 'REVERTED_TO_PENDING' }
    | { kind: 'REVERSED'; referrerId: number; referredUserId: number; rewardAmount: number; welcomeCreditAmount: number }
  > {
    // qualifyingOrderId isn't unique at the schema level (it's only ever
    // actually set on at most one referral per order in practice — a
    // customer's referral is captured once, at registration — but Prisma
    // needs findFirst here since there's no DB-level unique constraint on
    // this column to back a findUnique).
    const referral = await tx.referral.findFirst({ where: { qualifyingOrderId: orderId } });
    if (!referral) return null;

    if (referral.status === ReferralStatus.QUALIFIED || referral.status === ReferralStatus.CAPPED) {
      const reverted = await tx.referral.updateMany({
        where: { id: referral.id, status: referral.status },
        data: { status: ReferralStatus.PENDING, qualifyingOrderId: null, qualifiedAt: null },
      });
      return reverted.count > 0 ? { kind: 'REVERTED_TO_PENDING' } : null;
    }

    if (referral.status === ReferralStatus.REWARDED) {
      // Atomic idempotency gate — the same refund approved twice (or two
      // different refunds somehow both resolving to this order) only
      // claws back once, since the second attempt finds status is no
      // longer REWARDED.
      const flip = await tx.referral.updateMany({
        where: { id: referral.id, status: ReferralStatus.REWARDED },
        data: { status: ReferralStatus.REVERSED, reversedAt: new Date() },
      });
      if (flip.count === 0) return null;

      const rewardAmount = referral.rewardAmount ?? 0;
      const welcomeCreditAmount = referral.welcomeCreditAmount;

      // Deliberately NOT the `gte`-guarded decrement debitWalletForCheckout
      // uses — a clawback must succeed even if it pushes the balance
      // negative (the money was already spent or withdrawn in good faith;
      // see the plan's explicit "saldo boleh negatif" policy).
      if (rewardAmount > 0) {
        const updatedReferrer = await tx.user.update({
          where: { id: referral.referrerId },
          data: { walletCredit: { decrement: rewardAmount } },
          select: { walletCredit: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: referral.referrerId,
            type: 'REFERRAL_REWARD_REVERSED',
            amount: -rewardAmount,
            balanceAfter: updatedReferrer.walletCredit,
            referralId: referral.id,
            orderId,
            note: `Referral reward reversed — order #${orderId} was fully refunded`,
          },
        });
      }
      if (welcomeCreditAmount > 0) {
        const updatedFriend = await tx.user.update({
          where: { id: referral.referredUserId },
          data: { walletCredit: { decrement: welcomeCreditAmount } },
          select: { walletCredit: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: referral.referredUserId,
            type: 'REFERRAL_REWARD_REVERSED',
            amount: -welcomeCreditAmount,
            balanceAfter: updatedFriend.walletCredit,
            referralId: referral.id,
            orderId,
            note: `Referral welcome credit reversed — order #${orderId} was fully refunded`,
          },
        });
      }

      return {
        kind: 'REVERSED',
        referrerId: referral.referrerId,
        referredUserId: referral.referredUserId,
        rewardAmount,
        welcomeCreditAmount,
      };
    }

    // PENDING or already REVERSED — nothing to do.
    return null;
  }

  // ==========================================================================
  // Checkout-time: spend wallet credit. Called from OrdersService.create()
  // inside its own checkout transaction, alongside CouponsService.recordUsage.
  // Unchanged in Phase 1 — the caller already clamps a negative/zero
  // balance to 0 before this is ever invoked (see orders.service.ts).
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
    const [totalReferred, totalRewarded, pendingCount, rewardSum] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'REWARDED' } }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: { in: ['PENDING', 'QUALIFIED', 'CAPPED'] } },
      }),
      this.prisma.referral.aggregate({
        where: { referrerId: userId, status: 'REWARDED' },
        _sum: { rewardAmount: true },
      }),
    ]);

    return {
      referralCode: user?.referralCode ?? null,
      referralLink: user ? this.buildReferralLink(user.referralCode) : null,
      walletCredit: user?.walletCredit ?? 0,
      totalReferred,
      totalRewarded,
      totalRewardedAmount: rewardSum._sum.rewardAmount ?? 0,
      pendingCount,
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

  async listForAdmin(params: { page: number; limit: number; status?: ReferralStatus }) {
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
    const [totalReferrals, rewardedReferrals, pendingReferrals, qualifiedReferrals, cappedReferrals, reversedReferrals, rewardSum] =
      await Promise.all([
        this.prisma.referral.count(),
        this.prisma.referral.count({ where: { status: 'REWARDED' } }),
        this.prisma.referral.count({ where: { status: 'PENDING' } }),
        this.prisma.referral.count({ where: { status: 'QUALIFIED' } }),
        this.prisma.referral.count({ where: { status: 'CAPPED' } }),
        this.prisma.referral.count({ where: { status: 'REVERSED' } }),
        this.prisma.referral.aggregate({ where: { status: 'REWARDED' }, _sum: { rewardAmount: true } }),
      ]);
    return {
      totalReferrals,
      successfulReferrals: rewardedReferrals,
      pendingReferrals,
      qualifiedReferrals,
      cappedReferrals,
      reversedReferrals,
      rewardsIssued: rewardSum._sum.rewardAmount ?? 0,
    };
  }

  async getReferralSettings() {
    const settings = await this.settingsService.getSettings();
    return {
      referralProgramEnabled: settings.referralProgramEnabled,
      referralWelcomeCredit: settings.referralWelcomeCredit,
      referralRewardAmount: settings.referralRewardAmount,
      referralHoldDays: settings.referralHoldDays,
      referralMinQualifyingAmount: settings.referralMinQualifyingAmount,
      referralMonthlyCap: settings.referralMonthlyCap,
    };
  }

  async updateReferralSettings(dto: UpdateReferralSettingsDto) {
    await this.settingsService.updateSettings(dto);
    return this.getReferralSettings();
  }
}
