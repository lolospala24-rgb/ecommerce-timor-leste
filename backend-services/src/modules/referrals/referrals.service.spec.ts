import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';

// Phase 1 of the referral program: reward/welcome credit is held during a
// grace period (long enough to outlast the refund window on the order
// that qualified it), subject to a monthly cap per referrer, and clawed
// back if the order is fully refunded after already paying out. These
// tests pin down the guarantees that flow depends on: every status
// transition and every wallet mutation goes through the same
// conditional-updateMany idiom used elsewhere in this codebase (see
// PayoutsService's own spec), so a concurrent/duplicate trigger can never
// double-credit, double-reverse, or slip past the monthly cap.
describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: any;
  let settingsService: any;
  let notificationsService: any;

  const baseSettings = {
    referralProgramEnabled: true,
    referralWelcomeCredit: 3,
    referralRewardAmount: 5,
    referralHoldDays: 7,
    referralMinQualifyingAmount: 5,
    referralMonthlyCap: 20,
    referralRequirePhoneVerification: false,
  };

  beforeEach(async () => {
    prisma = {
      referral: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      user: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      referralMonthlyRewardCount: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      refund: {
        // Default: no open refund blocking a payout, and no approved
        // refunds reducing the order's net-paid amount. Individual tests
        // override either as needed.
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    settingsService = {
      getSettings: jest.fn().mockResolvedValue({ ...baseSettings }),
      updateSettings: jest.fn(),
    };

    notificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(ReferralsService);
  });

  // ==========================================================================
  // 1. Order DELIVERED >= $5 -> QUALIFIED, no credit yet
  // ==========================================================================
  describe('qualifyReferralIfEligible', () => {
    it('flips PENDING -> QUALIFIED when the qualifying amount clears the minimum, without crediting anyone', async () => {
      prisma.referral.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      await service.qualifyReferralIfEligible(prisma, {
        id: 100,
        customerId: 7,
        subtotal: 10,
        walletCreditUsed: 0,
      });

      expect(prisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: 'PENDING' },
          data: expect.objectContaining({ status: 'QUALIFIED', qualifyingOrderId: 100 }),
        }),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    // ==========================================================================
    // 6. Below the minimum (including wallet credit pushing the paid
    //    amount under it) -> stays PENDING
    // ==========================================================================
    it('does not qualify when subtotal minus wallet credit used is below the minimum', async () => {
      prisma.referral.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' });

      await service.qualifyReferralIfEligible(prisma, {
        id: 101,
        customerId: 7,
        subtotal: 6,
        walletCreditUsed: 2, // actually paid: $4, below the $5 minimum
      });

      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });

    it('does nothing for a customer with no referral row', async () => {
      prisma.referral.findUnique.mockResolvedValue(null);

      await service.qualifyReferralIfEligible(prisma, { id: 102, customerId: 7, subtotal: 50, walletCreditUsed: 0 });

      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });

    it('does nothing when the referral is not PENDING (not the first qualifying order)', async () => {
      prisma.referral.findUnique.mockResolvedValue({ id: 1, status: 'QUALIFIED' });

      await service.qualifyReferralIfEligible(prisma, { id: 103, customerId: 7, subtotal: 50, walletCreditUsed: 0 });

      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. Job after the hold period -> REWARDED, both sides credited,
  //    WalletTransaction recorded
  //
  // 10. A friend who already received their welcome credit under the old
  //     flow doesn't get it twice
  // ==========================================================================
  describe('payoutDueReferrals — normal payout', () => {
    it('pays out a QUALIFIED referral past its hold period: both sides credited, WalletTransaction rows written', async () => {
      const referral = {
        id: 1,
        referrerId: 10,
        referredUserId: 20,
        status: 'QUALIFIED',
        welcomeCreditAmount: 3,
        welcomeCreditGrantedAt: null,
        qualifyingOrderId: 555,
      };
      prisma.referral.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.user.update
        .mockResolvedValueOnce({ walletCredit: 3 }) // friend's welcome credit
        .mockResolvedValueOnce({ walletCredit: 5 }); // referrer's reward
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 }); // slot reserved
      prisma.referral.updateMany.mockResolvedValue({ count: 1 }); // REWARDED flip succeeds

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 1, capped: 0, failed: 0 });

      // Friend's welcome credit
      expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
        where: { id: 20 },
        data: { walletCredit: { increment: 3 } },
        select: { walletCredit: true },
      });
      // Referrer's reward
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
        where: { id: 10 },
        data: { walletCredit: { increment: 5 } },
        select: { walletCredit: true },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 20, type: 'REFERRAL_WELCOME', amount: 3 }) }),
      );
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 10, type: 'REFERRAL_REWARD', amount: 5 }) }),
      );
      expect(prisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: { in: ['QUALIFIED', 'CAPPED'] } },
          data: expect.objectContaining({ status: 'REWARDED', rewardAmount: 5 }),
        }),
      );
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, type: 'REFERRAL_REWARD_EARNED' }),
      );
    });

    it('does not re-grant welcome credit to a friend who already has welcomeCreditGrantedAt set (pre-existing/backfilled referral)', async () => {
      const referral = {
        id: 2,
        referrerId: 11,
        referredUserId: 21,
        status: 'QUALIFIED',
        welcomeCreditAmount: 3,
        welcomeCreditGrantedAt: new Date('2026-01-01'),
        qualifyingOrderId: 556,
      };
      prisma.referral.findMany.mockResolvedValue([{ id: 2 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.user.update.mockResolvedValue({ walletCredit: 5 }); // only the referrer's call
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      await service.payoutDueReferrals();

      // Only ONE user.update call (the referrer's reward) — the friend's
      // welcome credit is never touched a second time.
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 11 } }),
      );
      expect(prisma.walletTransaction.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 21, type: 'REFERRAL_WELCOME' }) }),
      );
    });
  });

  // ==========================================================================
  // 1. A QUALIFIED referral with an open (PENDING) refund on its
  //    qualifying order -> the job does not pay it out
  // 2. That refund is later REJECTED -> the next sweep pays it out normally
  // ==========================================================================
  describe('payoutDueReferrals — open refund on the qualifying order', () => {
    const referral = {
      id: 7,
      referrerId: 15,
      referredUserId: 26,
      status: 'QUALIFIED',
      welcomeCreditAmount: 3,
      welcomeCreditGrantedAt: null,
      qualifyingOrderId: 700,
    };

    it('skips a referral whose qualifying order has a PENDING refund request', async () => {
      prisma.referral.findMany.mockResolvedValue([{ id: 7 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.refund.findFirst.mockResolvedValue({ id: 99 }); // an open refund exists

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 0, capped: 0, failed: 0 });
      expect(prisma.refund.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderId: 700, status: 'PENDING' } }),
      );
      // Nothing credited, nothing flipped, nothing touched — left exactly
      // as it was for the next sweep to re-check.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
      expect(prisma.referral.update).not.toHaveBeenCalled();
    });

    it('pays out normally once the refund is no longer open (e.g. rejected)', async () => {
      prisma.referral.findMany.mockResolvedValue([{ id: 7 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.refund.findFirst.mockResolvedValue(null); // rejected/resolved — no longer PENDING
      prisma.user.update.mockResolvedValue({ walletCredit: 5 });
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 1, capped: 0, failed: 0 });
      expect(prisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REWARDED' }) }),
      );
    });
  });

  // ==========================================================================
  // referralRequirePhoneVerification gate (Phase 2, Section C):
  // - flag false -> payout behaves exactly like Phase 1 (regression check)
  // - flag true + friend unverified -> SKIPPED, nothing credited
  // - flag true + friend verified -> pays out normally
  // ==========================================================================
  describe('payoutDueReferrals — phone verification gate', () => {
    const referral = {
      id: 8,
      referrerId: 16,
      referredUserId: 27,
      status: 'QUALIFIED',
      welcomeCreditAmount: 3,
      welcomeCreditGrantedAt: null,
      qualifyingOrderId: 800,
    };

    it('flag false: pays out exactly as Phase 1, regardless of phoneVerifiedAt', async () => {
      prisma.referral.findMany.mockResolvedValue([{ id: 8 }]);
      prisma.referral.findUnique.mockResolvedValue({ ...referral, referredUser: { phoneVerifiedAt: null } });
      prisma.user.update.mockResolvedValue({ walletCredit: 5 });
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });
      // baseSettings already has referralRequirePhoneVerification: false.

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 1, capped: 0, failed: 0 });
    });

    it('flag true + friend unverified: SKIPPED, nothing credited, referral untouched', async () => {
      settingsService.getSettings.mockResolvedValue({ ...baseSettings, referralRequirePhoneVerification: true });
      prisma.referral.findMany.mockResolvedValue([{ id: 8 }]);
      prisma.referral.findUnique.mockResolvedValue({ ...referral, referredUser: { phoneVerifiedAt: null } });

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 0, capped: 0, failed: 0 });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
      expect(prisma.referral.update).not.toHaveBeenCalled();
      // Doesn't even bother checking for an open refund — the phone gate
      // short-circuits first.
      expect(prisma.refund.findFirst).not.toHaveBeenCalled();
    });

    it('flag true + friend verified (next sweep after verification): pays out normally', async () => {
      settingsService.getSettings.mockResolvedValue({ ...baseSettings, referralRequirePhoneVerification: true });
      prisma.referral.findMany.mockResolvedValue([{ id: 8 }]);
      prisma.referral.findUnique.mockResolvedValue({
        ...referral,
        referredUser: { phoneVerifiedAt: new Date('2026-10-20') },
      });
      prisma.user.update.mockResolvedValue({ walletCredit: 5 });
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 1, capped: 0, failed: 0 });
    });
  });

  // ==========================================================================
  // 7. Monthly cap: the 21st reward in one month -> CAPPED, the friend
  //    still gets their credit; it pays out the following month
  // ==========================================================================
  describe('payoutDueReferrals — monthly cap', () => {
    it('CAPs the referrer reward when the monthly slot is unavailable, but still credits the friend', async () => {
      const referral = {
        id: 3,
        referrerId: 12,
        referredUserId: 22,
        status: 'QUALIFIED',
        welcomeCreditAmount: 3,
        welcomeCreditGrantedAt: null,
        qualifyingOrderId: 557,
      };
      prisma.referral.findMany.mockResolvedValue([{ id: 3 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.user.update.mockResolvedValue({ walletCredit: 3 });
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 0 }); // cap already full

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 0, capped: 1, failed: 0 });
      // Friend still credited.
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 22 } }));
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 22, type: 'REFERRAL_WELCOME' }) }),
      );
      // Referrer NOT credited, referral flipped to CAPPED not REWARDED.
      expect(prisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 12 } }));
      expect(prisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 3, status: 'QUALIFIED' }, data: { status: 'CAPPED' } }),
      );
    });

    it('retries a CAPPED referral the following month: pays the referrer without re-granting the already-credited friend', async () => {
      const referral = {
        id: 3,
        referrerId: 12,
        referredUserId: 22,
        status: 'CAPPED',
        welcomeCreditAmount: 3,
        welcomeCreditGrantedAt: new Date('2026-09-01'), // granted on the earlier CAPPED attempt
        qualifyingOrderId: 557,
      };
      prisma.referral.findMany.mockResolvedValue([{ id: 3 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.user.update.mockResolvedValue({ walletCredit: 5 });
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 }); // new month, slot free
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.payoutDueReferrals();

      expect(result).toEqual({ processed: 1, rewarded: 1, capped: 0, failed: 0 });
      expect(prisma.user.update).toHaveBeenCalledTimes(1); // referrer only
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 12 } }));
    });
  });

  // ==========================================================================
  // 8. Two simultaneous payouts don't double-reward and don't exceed the cap
  // ==========================================================================
  describe('payoutDueReferrals — concurrency guards', () => {
    it('a losing concurrent monthly-cap reservation results in CAPPED, not a duplicate reward', async () => {
      // Two referrals for the same referrer processed in one sweep; the
      // counter's atomic conditional increment reserves exactly one slot.
      const referralA = { id: 4, referrerId: 13, referredUserId: 23, status: 'QUALIFIED', welcomeCreditAmount: 0, welcomeCreditGrantedAt: new Date(), qualifyingOrderId: 601 };
      const referralB = { id: 5, referrerId: 13, referredUserId: 24, status: 'QUALIFIED', welcomeCreditAmount: 0, welcomeCreditGrantedAt: new Date(), qualifyingOrderId: 602 };
      prisma.referral.findMany.mockResolvedValue([{ id: 4 }, { id: 5 }]);
      prisma.referral.findUnique.mockResolvedValueOnce(referralA).mockResolvedValueOnce(referralB);
      prisma.user.update.mockResolvedValue({ walletCredit: 5 });
      // First reservation succeeds, second (simulating the cap being hit
      // by the first one just now) fails.
      prisma.referralMonthlyRewardCount.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.payoutDueReferrals();

      expect(result.rewarded).toBe(1);
      expect(result.capped).toBe(1);
      // Only one referrer credit — not two.
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('does not double-credit when the reward-flip guard loses a race after reserving a monthly slot', async () => {
      const referral = { id: 6, referrerId: 14, referredUserId: 25, status: 'QUALIFIED', welcomeCreditAmount: 0, welcomeCreditGrantedAt: new Date(), qualifyingOrderId: 603 };
      prisma.referral.findMany.mockResolvedValue([{ id: 6 }]);
      prisma.referral.findUnique.mockResolvedValue(referral);
      prisma.referralMonthlyRewardCount.updateMany.mockResolvedValue({ count: 1 });
      // Something else already flipped this exact referral out of
      // QUALIFIED/CAPPED by the time this transaction tries to.
      prisma.referral.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.payoutDueReferrals();

      expect(result.rewarded).toBe(0);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 3. Refund during the hold period -> back to PENDING, no credit
  // 5/9. Partial refunds -> net-paid amount recomputed cumulatively
  // 7. Two small partial refunds that together cross the threshold
  // 8. A partial refund that still leaves net-paid >= minimum -> no change
  // 10. CAPPED -> PENDING claws back the friend's already-granted credit
  // ==========================================================================
  describe('reconcileReferralAfterRefund — during hold period (QUALIFIED/CAPPED)', () => {
    it('reverts a QUALIFIED referral to PENDING when a full refund drops net-paid below the minimum, without touching any wallet (nothing was ever granted)', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        id: 1, status: 'QUALIFIED', referrerId: 10, referredUserId: 20,
        rewardAmount: null, welcomeCreditAmount: 3, welcomeCreditGrantedAt: null,
      });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 20 } }); // full refund
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toEqual({ kind: 'REVERTED_TO_PENDING', welcomeCreditClawedBack: false, referredUserId: 20, welcomeCreditAmount: 3 });
      expect(prisma.referral.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'QUALIFIED' },
        data: { status: 'PENDING', qualifyingOrderId: null, qualifiedAt: null },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('does NOT revert when a partial refund still leaves net-paid at/above the minimum', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        id: 1, status: 'QUALIFIED', referrerId: 10, referredUserId: 20,
        rewardAmount: null, welcomeCreditAmount: 3, welcomeCreditGrantedAt: null,
      });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5 } }); // net-paid = 15, still >= $5

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });

    it('detects two small partial refunds that together cross the threshold (cumulative aggregate)', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        id: 1, status: 'QUALIFIED', referrerId: 10, referredUserId: 20,
        rewardAmount: null, welcomeCreditAmount: 3, welcomeCreditGrantedAt: null,
      });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      // First partial refund approved: $2 so far -> net-paid $18, fine.
      prisma.refund.aggregate.mockResolvedValueOnce({ _sum: { amount: 2 } });
      const first = await service.reconcileReferralAfterRefund(prisma, 555);
      expect(first).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();

      // Second partial refund approved: $17 cumulative -> net-paid $3, now below $5.
      prisma.refund.aggregate.mockResolvedValueOnce({ _sum: { amount: 17 } });
      const second = await service.reconcileReferralAfterRefund(prisma, 555);
      expect(second?.kind).toBe('REVERTED_TO_PENDING');
      expect(prisma.referral.updateMany).toHaveBeenCalledTimes(1);
    });

    it('claws back the friend\'s already-granted welcome credit when a CAPPED referral reverts to PENDING, and clears welcomeCreditGrantedAt', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        id: 1, status: 'CAPPED', referrerId: 10, referredUserId: 20,
        rewardAmount: null, welcomeCreditAmount: 3, welcomeCreditGrantedAt: new Date('2026-09-01'),
      });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 20 } });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({ walletCredit: -3 });

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toEqual({ kind: 'REVERTED_TO_PENDING', welcomeCreditClawedBack: true, referredUserId: 20, welcomeCreditAmount: 3 });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { walletCredit: { decrement: 3 } },
        select: { walletCredit: true },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 20, type: 'REFERRAL_REWARD_REVERSED', amount: -3 }) }),
      );
      // Cleared so the friend can honestly re-earn it on a later order.
      expect(prisma.referral.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { welcomeCreditGrantedAt: null } });
      // No monthly-cap counter touched — CAPPED never reserved a slot to begin with.
      expect(prisma.referralMonthlyRewardCount.updateMany).not.toHaveBeenCalled();
    });

    it('does nothing for an order with no matching referral', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);

      const outcome = await service.reconcileReferralAfterRefund(prisma, 999);

      expect(outcome).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4/6. Refund drops net-paid below minimum after REWARDED -> REVERSED,
  //      clawed back from both sides, balance allowed to go negative
  //
  // 9. The same refund processed twice -> clawback happens only once
  // ==========================================================================
  describe('reconcileReferralAfterRefund — clawback after REWARDED', () => {
    const rewardedReferral = {
      id: 1,
      status: 'REWARDED',
      referrerId: 10,
      referredUserId: 20,
      rewardAmount: 5,
      welcomeCreditAmount: 3,
      welcomeCreditGrantedAt: new Date('2026-09-01'),
    };

    it('claws back the reward from the referrer and the welcome credit from the friend when a (full) refund drops net-paid below the minimum, allowing a negative balance', async () => {
      prisma.referral.findFirst.mockResolvedValue({ ...rewardedReferral });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 20 } });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update
        .mockResolvedValueOnce({ walletCredit: -5 }) // referrer, now negative
        .mockResolvedValueOnce({ walletCredit: -3 }); // friend, now negative

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toEqual({ kind: 'REVERSED', referrerId: 10, referredUserId: 20, rewardAmount: 5, welcomeCreditAmount: 3 });
      expect(prisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, status: 'REWARDED' }, data: expect.objectContaining({ status: 'REVERSED' }) }),
      );
      // Plain decrement — no `gte` balance guard, unlike debitWalletForCheckout.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { walletCredit: { decrement: 5 } },
        select: { walletCredit: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { walletCredit: { decrement: 3 } },
        select: { walletCredit: true },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 10, type: 'REFERRAL_REWARD_REVERSED', amount: -5, balanceAfter: -5 }) }),
      );
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 20, type: 'REFERRAL_REWARD_REVERSED', amount: -3, balanceAfter: -3 }) }),
      );
    });

    it('does NOT claw back a REWARDED referral when a partial refund still leaves net-paid at/above the minimum', async () => {
      prisma.referral.findFirst.mockResolvedValue({ ...rewardedReferral });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5 } }); // net-paid = 15

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('processing the same refund twice only claws back once', async () => {
      prisma.referral.findFirst.mockResolvedValue({ ...rewardedReferral });
      prisma.order.findUnique.mockResolvedValue({ subtotal: 20, walletCreditUsed: 0 });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 20 } });
      prisma.user.update.mockResolvedValue({ walletCredit: -5 });
      // First call: the atomic guard succeeds (status really is REWARDED).
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 1 });

      const first = await service.reconcileReferralAfterRefund(prisma, 555);
      expect(first?.kind).toBe('REVERSED');
      expect(prisma.user.update).toHaveBeenCalledTimes(2);

      // Second call: findFirst still returns the (stale, in-memory) row
      // with status REWARDED, but the atomic guard now matches 0 rows
      // because the real status is already REVERSED from the first call.
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 0 });

      const second = await service.reconcileReferralAfterRefund(prisma, 555);
      expect(second).toBeNull();
      // No additional wallet mutations from the second attempt.
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('does nothing for a referral that is already REVERSED or still PENDING', async () => {
      prisma.referral.findFirst.mockResolvedValue({ id: 1, status: 'REVERSED', referrerId: 10, referredUserId: 20, rewardAmount: 5, welcomeCreditAmount: 3 });

      const outcome = await service.reconcileReferralAfterRefund(prisma, 555);

      expect(outcome).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 9. Checkout with a zero or negative balance -> no wallet deduction
  //    (debitWalletForCheckout's own guard — the upstream Math.max(balance, 0)
  //    clamp in OrdersService.create is what actually produces `amount`
  //    here; this pins down ReferralsService's own defense-in-depth guard)
  // ==========================================================================
  describe('debitWalletForCheckout', () => {
    it('does nothing when the amount to apply is zero', async () => {
      await service.debitWalletForCheckout(prisma, 1, 0);

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('does nothing when the amount to apply is negative', async () => {
      await service.debitWalletForCheckout(prisma, 1, -5);

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('debits a positive amount via the atomic gte-guarded decrement', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ walletCredit: 2 });

      await service.debitWalletForCheckout(prisma, 1, 3, 777);

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 1, walletCredit: { gte: 3 } },
        data: { walletCredit: { decrement: 3 } },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 1, type: 'CHECKOUT_REDEMPTION', amount: -3, orderId: 777 }) }),
      );
    });
  });

  // ==========================================================================
  // Registration-time: welcome credit is no longer granted instantly.
  // ==========================================================================
  describe('createReferralForNewUser', () => {
    it('creates the Referral row but does not touch the wallet', async () => {
      const amount = await service.createReferralForNewUser(prisma, 10, 20, 'abc123');

      expect(amount).toBe(3);
      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ referrerId: 10, referredUserId: 20, welcomeCreditAmount: 3 }) }),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('returns 0 and still creates nothing extra when the program is disabled', async () => {
      settingsService.getSettings.mockResolvedValue({ ...baseSettings, referralProgramEnabled: false });

      const amount = await service.createReferralForNewUser(prisma, 10, 20, 'abc123');

      expect(amount).toBe(0);
      expect(prisma.referral.create).not.toHaveBeenCalled();
    });
  });
});
