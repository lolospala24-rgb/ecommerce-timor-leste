import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LedgerEntryType } from '@prisma/client';

// FinanceService is the single writer of SellerBalance/SellerLedgerEntry —
// these tests cover the two flows the admin panel exposes directly:
// createAdjustment (a manual correction to a seller's balance) and
// reverseEarningsOnRefund (the proportional refund math that also feeds
// createAdjustment's sibling flows). Both write real money deltas, so the
// thing worth pinning down is the arithmetic and which bucket moves — not
// just "it doesn't throw".
describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: any;

  const emptyBalance = {
    id: 1,
    sellerId: 9,
    pendingAmount: 0,
    availableAmount: 0,
    processingAmount: 0,
    paidOutAmount: 0,
    refundedAmount: 0,
  };

  beforeEach(async () => {
    prisma = {
      seller: { findUnique: jest.fn() },
      sellerBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      sellerLedgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        createMany: jest.fn(),
        findFirst: jest.fn(),
      },
      platformBalance: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      platformLedgerEntry: { create: jest.fn(), createMany: jest.fn() },
      refund: { findUnique: jest.fn(), update: jest.fn() },
      order: { findUnique: jest.fn() },
      adminLog: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: { getSettings: jest.fn() } },
      ],
    }).compile();

    service = module.get(FinanceService);
  });

  describe('createAdjustment', () => {
    it('throws when the seller does not exist', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);
      await expect(service.createAdjustment(9, 'available', 50, 'correction', 42)).rejects.toThrow('Seller not found');
    });

    it('adds a positive delta to the chosen bucket and writes a matching ledger entry', async () => {
      prisma.seller.findUnique.mockResolvedValue({ id: 9 });
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, availableAmount: 100 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, availableAmount: 150 });

      await service.createAdjustment(9, 'available', 50, 'underpaid last month', 42);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sellerId: 9 }, data: { availableAmount: 150 } }),
      );
      expect(prisma.sellerLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: 9,
            type: LedgerEntryType.ADJUSTMENT,
            availableDelta: 50,
            note: expect.stringContaining('underpaid last month'),
          }),
        }),
      );
      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'CREATE_ADJUSTMENT' }) }),
      );
    });

    it('subtracts a negative delta from the chosen bucket', async () => {
      prisma.seller.findUnique.mockResolvedValue({ id: 9 });
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, pendingAmount: 200 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, pendingAmount: 120 });

      await service.createAdjustment(9, 'pending', -80, 'overcredited sale', 42);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { pendingAmount: 120 } }),
      );
      expect(prisma.sellerLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ pendingDelta: -80 }) }),
      );
    });

    it('maps the "refunded" bucket to refundedAmount/refundedDelta', async () => {
      prisma.seller.findUnique.mockResolvedValue({ id: 9 });
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, refundedAmount: 10 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, refundedAmount: 15 });

      await service.createAdjustment(9, 'refunded', 5, 'ledger correction', 42);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { refundedAmount: 15 } }),
      );
      expect(prisma.sellerLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ refundedDelta: 5 }) }),
      );
    });
  });

  describe('reverseEarningsOnRefund', () => {
    it('throws when the refund does not exist', async () => {
      prisma.refund.findUnique.mockResolvedValue(null);
      await expect(service.reverseEarningsOnRefund(prisma, 1)).rejects.toThrow('reverseEarningsOnRefund: refund 1 not found');
    });

    it('is a no-op when the order was never actually credited (no sellerNetAmount)', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, orderId: 1, amount: 50 });
      prisma.order.findUnique.mockResolvedValue({ id: 1, sellerNetAmount: null, commissionAmount: null });

      const result = await service.reverseEarningsOnRefund(prisma, 1);

      expect(result).toBeUndefined();
      expect(prisma.sellerBalance.update).not.toHaveBeenCalled();
    });

    it('reverses proportionally from `pending` when the order has not been released yet', async () => {
      // Full order was $100, seller net $90 after $10 commission; a $50
      // partial refund is exactly half, so half of the net/commission
      // reverses too.
      prisma.refund.findUnique.mockResolvedValue({ id: 1, orderId: 1, amount: 50 });
      prisma.order.findUnique.mockResolvedValue({
        id: 1, orderNumber: 'ORD-1', total: 100, sellerNetAmount: 90, commissionAmount: 10,
      });
      prisma.sellerLedgerEntry.findFirst.mockResolvedValue(null); // no RELEASE entry yet
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, pendingAmount: 90 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, pendingAmount: 45, refundedAmount: 45 });
      prisma.platformBalance.findFirst.mockResolvedValue({ id: 1, commissionRevenue: 10, shippingHeld: 0, shippingRemitted: 0, taxHeld: 0, taxRemitted: 0 });

      const result = await service.reverseEarningsOnRefund(prisma, 1);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pendingAmount: 45, availableAmount: 0, refundedAmount: 45 }),
        }),
      );
      expect(result.reversedNet).toBe(45);
      expect(result.reversedCommission).toBe(5);
      expect(result.wentNegative).toBe(false);
    });

    it('reverses proportionally from `available` once the order has already been released', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, orderId: 1, amount: 100 });
      prisma.order.findUnique.mockResolvedValue({
        id: 1, orderNumber: 'ORD-1', total: 100, sellerNetAmount: 90, commissionAmount: 10,
      });
      prisma.sellerLedgerEntry.findFirst.mockResolvedValue({ id: 5, type: LedgerEntryType.RELEASE }); // already released
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, availableAmount: 90 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, availableAmount: 0, refundedAmount: 90 });
      prisma.platformBalance.findFirst.mockResolvedValue({ id: 1, commissionRevenue: 10, shippingHeld: 0, shippingRemitted: 0, taxHeld: 0, taxRemitted: 0 });

      await service.reverseEarningsOnRefund(prisma, 1);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pendingAmount: 0, availableAmount: 0, refundedAmount: 90 }),
        }),
      );
    });

    it('flags wentNegative when the reversal exceeds what is left in the bucket (already paid out)', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, orderId: 1, amount: 100 });
      prisma.order.findUnique.mockResolvedValue({
        id: 1, orderNumber: 'ORD-1', total: 100, sellerNetAmount: 90, commissionAmount: 10,
      });
      prisma.sellerLedgerEntry.findFirst.mockResolvedValue({ id: 5, type: LedgerEntryType.RELEASE });
      // Seller already withdrew everything — available is 0, so reversing
      // $90 pushes it negative rather than blocking the refund.
      prisma.sellerBalance.findUnique.mockResolvedValue({ ...emptyBalance, availableAmount: 0 });
      prisma.sellerBalance.update.mockResolvedValue({ ...emptyBalance, availableAmount: -90, refundedAmount: 90 });
      prisma.platformBalance.findFirst.mockResolvedValue({ id: 1, commissionRevenue: 10, shippingHeld: 0, shippingRemitted: 0, taxHeld: 0, taxRemitted: 0 });

      const result = await service.reverseEarningsOnRefund(prisma, 1);

      expect(result.wentNegative).toBe(true);
    });
  });
});
