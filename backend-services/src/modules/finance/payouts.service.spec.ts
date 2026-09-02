import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PayoutStatus } from '@prisma/client';

// A payout moves real money out the door once marked paid — these tests
// exist to pin down the two guarantees the whole flow depends on: (1) the
// available -> processing reservation at request time is atomic (two
// concurrent requests can't both reserve more than what's actually
// available), and (2) each status transition (approve/reject/markPaid)
// only fires from the one legal prior status, guarded the same
// conditional-updateMany way as OrdersService/PaymentsService elsewhere in
// this codebase.
describe('PayoutsService', () => {
  let service: PayoutsService;
  let prisma: any;
  let settingsService: any;

  const seller = {
    id: 9,
    userId: 1,
    bankName: 'BNU',
    bankAccountName: 'Toko Lolospala',
    bankAccountNumber: '123456789',
  };

  beforeEach(async () => {
    prisma = {
      seller: { findUnique: jest.fn() },
      sellerBalance: {
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      payout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      sellerLedgerEntry: { create: jest.fn() },
      adminLog: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    settingsService = {
      getSettings: jest.fn().mockResolvedValue({ minimumPayoutAmount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get(PayoutsService);
  });

  describe('requestPayout (reservation)', () => {
    it('rejects a seller with no bank details on file', async () => {
      prisma.seller.findUnique.mockResolvedValue({ ...seller, bankName: null });

      await expect(service.requestPayout(1, 50)).rejects.toThrow(BadRequestException);
      expect(prisma.sellerBalance.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an amount below the configured minimum payout', async () => {
      prisma.seller.findUnique.mockResolvedValue(seller);
      settingsService.getSettings.mockResolvedValue({ minimumPayoutAmount: 20 });

      await expect(service.requestPayout(1, 10)).rejects.toThrow(BadRequestException);
      expect(prisma.sellerBalance.updateMany).not.toHaveBeenCalled();
    });

    // The core race-safety guarantee: the reservation is a single
    // conditional updateMany (available >= requestedAmount), not a
    // read-then-write — so two concurrent requests racing the same balance
    // can't both succeed against money that only actually covers one of them.
    it('rejects when the atomic reservation matches zero rows (insufficient balance)', async () => {
      prisma.seller.findUnique.mockResolvedValue(seller);
      prisma.sellerBalance.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.requestPayout(1, 100)).rejects.toThrow(BadRequestException);
      expect(prisma.sellerBalance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: seller.id, availableAmount: { gte: 100 } },
        }),
      );
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('reserves the balance, creates a PENDING payout, and writes a ledger entry', async () => {
      prisma.seller.findUnique.mockResolvedValue(seller);
      prisma.sellerBalance.updateMany.mockResolvedValue({ count: 1 });
      prisma.sellerBalance.findUniqueOrThrow.mockResolvedValue({
        pendingAmount: 0,
        availableAmount: 400,
        processingAmount: 100,
        paidOutAmount: 0,
        refundedAmount: 0,
      });
      prisma.payout.create.mockResolvedValue({ id: 5, sellerId: seller.id, amount: 100, status: PayoutStatus.PENDING });

      const result = await service.requestPayout(1, 100);

      expect(prisma.sellerBalance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            availableAmount: { decrement: 100 },
            processingAmount: { increment: 100 },
          },
        }),
      );
      expect(prisma.payout.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 100, status: PayoutStatus.PENDING }) }),
      );
      expect(prisma.sellerLedgerEntry.create).toHaveBeenCalled();
      expect(result.status).toBe(PayoutStatus.PENDING);
    });
  });

  describe('approvePayout', () => {
    it('throws NotFoundException for a nonexistent payout', async () => {
      prisma.payout.findUnique.mockResolvedValue(null);
      await expect(service.approvePayout(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects a payout that is not PENDING', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, status: PayoutStatus.APPROVED });
      await expect(service.approvePayout(1, 1)).rejects.toThrow(BadRequestException);
    });

    // Same TOCTOU guard as PaymentsService.confirmPayment: the findUnique
    // check above runs outside any lock, so a concurrent approve/reject
    // pair must still only let one caller's write actually land.
    it('rejects when the atomic status-guard matches zero rows (already processed)', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, status: PayoutStatus.PENDING });
      prisma.payout.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approvePayout(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('approves a PENDING payout and logs the admin action', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, sellerId: 9, amount: 100, status: PayoutStatus.PENDING });
      prisma.payout.updateMany.mockResolvedValue({ count: 1 });
      prisma.payout.findUniqueOrThrow.mockResolvedValue({ id: 1, status: PayoutStatus.APPROVED });

      const result = await service.approvePayout(1, 42, 'looks good');

      expect(prisma.payout.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: PayoutStatus.PENDING },
          data: expect.objectContaining({ status: PayoutStatus.APPROVED, processedBy: 42 }),
        }),
      );
      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'APPROVE_PAYOUT' }) }),
      );
      expect(result.status).toBe(PayoutStatus.APPROVED);
    });
  });

  describe('rejectPayout', () => {
    it('rejects a payout that is neither PENDING nor APPROVED', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, status: PayoutStatus.PAID });
      await expect(service.rejectPayout(1, 1, 'no')).rejects.toThrow(BadRequestException);
    });

    // The money was moved into `processing` at request time (see
    // requestPayout) — rejecting must give it back, not just flip status.
    it('returns the reserved amount from processing back to available', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, sellerId: 9, amount: 100, status: PayoutStatus.PENDING });
      prisma.payout.updateMany.mockResolvedValue({ count: 1 });
      prisma.sellerBalance.update.mockResolvedValue({
        pendingAmount: 0,
        availableAmount: 500,
        processingAmount: 0,
        paidOutAmount: 0,
        refundedAmount: 0,
      });
      prisma.payout.findUniqueOrThrow.mockResolvedValue({ id: 1, status: PayoutStatus.REJECTED });

      await service.rejectPayout(1, 42, 'bank details invalid');

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 9 },
          data: {
            availableAmount: { increment: 100 },
            processingAmount: { decrement: 100 },
          },
        }),
      );
    });
  });

  describe('markPaid', () => {
    it('rejects a payout that is not APPROVED', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, status: PayoutStatus.PENDING });
      await expect(service.markPaid(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('moves the amount from processing to paidOut on an APPROVED payout', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 1, sellerId: 9, amount: 100, status: PayoutStatus.APPROVED });
      prisma.payout.updateMany.mockResolvedValue({ count: 1 });
      prisma.sellerBalance.update.mockResolvedValue({
        pendingAmount: 0,
        availableAmount: 0,
        processingAmount: 0,
        paidOutAmount: 100,
        refundedAmount: 0,
      });
      prisma.payout.findUniqueOrThrow.mockResolvedValue({ id: 1, status: PayoutStatus.PAID });

      const result = await service.markPaid(1, 42);

      expect(prisma.sellerBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            processingAmount: { decrement: 100 },
            paidOutAmount: { increment: 100 },
          },
        }),
      );
      expect(result.status).toBe(PayoutStatus.PAID);
    });
  });
});
