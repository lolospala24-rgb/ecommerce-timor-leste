import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { FinanceService } from './finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, PaymentStatus, RefundStatus, RefundType } from '@prisma/client';

// Refunds are the one flow that touches everything: payment status, order
// status, and (via FinanceService) the seller's ledger — these tests pin
// down the eligibility gates (who/when/what-status can request one), the
// atomic approve/reject guard (same TOCTOU pattern used throughout this
// codebase's money flows), and the FULL-vs-PARTIAL branching that decides
// whether the order gets cancelled and which PaymentStatus it lands on.
describe('RefundsService', () => {
  let service: RefundsService;
  let prisma: any;
  let financeService: any;
  let notificationsService: any;
  let mailService: any;

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      payment: { findUnique: jest.fn(), update: jest.fn() },
      refund: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      adminLog: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    financeService = { reverseEarningsOnRefund: jest.fn() };
    notificationsService = {
      notifyRefundRequested: jest.fn().mockResolvedValue(undefined),
      notifyRefundDecision: jest.fn().mockResolvedValue(undefined),
    };
    mailService = { sendPaymentRefundEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: FinanceService, useValue: financeService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(RefundsService);
  });

  describe('requestRefund (customer self-service eligibility)', () => {
    const deliveredOrder = {
      id: 1,
      orderNumber: 'ORD-1',
      customerId: 5,
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      payment: { id: 1, status: PaymentStatus.PAID, amount: 100 },
    };

    it('throws NotFoundException for a nonexistent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.requestRefund(1, 5, 'broken item')).rejects.toThrow(NotFoundException);
    });

    it('rejects a customer requesting a refund on someone else\'s order', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...deliveredOrder, customerId: 999 });
      await expect(service.requestRefund(1, 5, 'broken item')).rejects.toThrow(ForbiddenException);
    });

    it('rejects an order that is not DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...deliveredOrder, status: OrderStatus.SHIPPING });
      await expect(service.requestRefund(1, 5, 'broken item')).rejects.toThrow(BadRequestException);
    });

    it('rejects a request outside the refund window', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // window is 7 days
      prisma.order.findUnique.mockResolvedValue({ ...deliveredOrder, deliveredAt: staleDate });
      await expect(service.requestRefund(1, 5, 'broken item')).rejects.toThrow(BadRequestException);
    });

    it('rejects when the payment is not PAID', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce(deliveredOrder) // requestRefund's own lookup
        .mockResolvedValueOnce({ ...deliveredOrder, payment: { ...deliveredOrder.payment, status: PaymentStatus.FAILED } }); // createRequest's lookup
      await expect(service.requestRefund(1, 5, 'broken item')).rejects.toThrow(BadRequestException);
    });

    it('rejects a second request while one is already pending', async () => {
      prisma.order.findUnique.mockResolvedValue(deliveredOrder);
      prisma.refund.findFirst.mockResolvedValue({ id: 1, status: RefundStatus.PENDING });
      await expect(service.requestRefund(1, 5, 'still broken')).rejects.toThrow(BadRequestException);
    });

    it('creates a FULL refund when no amount is specified, and notifies', async () => {
      prisma.order.findUnique.mockResolvedValue(deliveredOrder);
      prisma.refund.findFirst.mockResolvedValue(null);
      prisma.refund.create.mockResolvedValue({ id: 1, amount: 100, type: RefundType.FULL, status: RefundStatus.PENDING });

      const result = await service.requestRefund(1, 5, 'item never arrived');

      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 100, type: RefundType.FULL }) }),
      );
      expect(notificationsService.notifyRefundRequested).toHaveBeenCalledWith(1, 1, 'ORD-1', 100);
      expect(result.type).toBe(RefundType.FULL);
    });

    it('creates a PARTIAL refund when a lesser amount is specified', async () => {
      prisma.order.findUnique.mockResolvedValue(deliveredOrder);
      prisma.refund.findFirst.mockResolvedValue(null);
      prisma.refund.create.mockResolvedValue({ id: 2, amount: 30, type: RefundType.PARTIAL, status: RefundStatus.PENDING });

      await service.requestRefund(1, 5, 'one item damaged', 30);

      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 30, type: RefundType.PARTIAL }) }),
      );
    });
  });

  describe('approveRefund', () => {
    const pendingRefund = {
      id: 1,
      orderId: 1,
      paymentId: 1,
      amount: 100,
      type: RefundType.FULL,
      status: RefundStatus.PENDING,
      reason: 'broken',
      payment: { amount: 100 },
      order: { status: OrderStatus.DELIVERED },
    };

    it('throws NotFoundException for a nonexistent refund', async () => {
      prisma.refund.findUnique.mockResolvedValue(null);
      await expect(service.approveRefund(1, 42)).rejects.toThrow(NotFoundException);
    });

    it('rejects a refund that is not PENDING', async () => {
      prisma.refund.findUnique.mockResolvedValue({ ...pendingRefund, status: RefundStatus.APPROVED });
      await expect(service.approveRefund(1, 42)).rejects.toThrow(BadRequestException);
    });

    // Same TOCTOU concern as PaymentsService.confirmPayment/rejectPayment —
    // the PENDING check above ran outside any lock.
    it('rejects when the atomic status-guard matches zero rows', async () => {
      prisma.refund.findUnique.mockResolvedValue(pendingRefund);
      prisma.refund.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approveRefund(1, 42)).rejects.toThrow(BadRequestException);
    });

    it('a FULL refund marks the payment REFUNDED, cancels the order, and reverses earnings', async () => {
      prisma.refund.findUnique.mockResolvedValue(pendingRefund);
      prisma.refund.updateMany.mockResolvedValue({ count: 1 });
      prisma.refund.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        orderId: 1,
        amount: 100,
        order: { orderNumber: 'ORD-1', customerId: 5, customer: { email: 'a@b.com', name: 'Ana' } },
      });

      await service.approveRefund(1, 42, 'confirmed damaged');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.REFUNDED } }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: OrderStatus.CANCELLED }) }),
      );
      expect(financeService.reverseEarningsOnRefund).toHaveBeenCalledWith(prisma, 1);
      expect(mailService.sendPaymentRefundEmail).toHaveBeenCalled();
      expect(notificationsService.notifyRefundDecision).toHaveBeenCalledWith(5, 1, 1, 'ORD-1', 100, true);
    });

    it('a PARTIAL refund marks the payment PARTIALLY_REFUNDED and does not cancel the order', async () => {
      const partialRefund = { ...pendingRefund, amount: 30, type: RefundType.PARTIAL };
      prisma.refund.findUnique.mockResolvedValue(partialRefund);
      prisma.refund.updateMany.mockResolvedValue({ count: 1 });
      prisma.refund.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        orderId: 1,
        amount: 30,
        order: { orderNumber: 'ORD-1', customerId: 5, customer: { email: 'a@b.com', name: 'Ana' } },
      });

      await service.approveRefund(1, 42);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.PARTIALLY_REFUNDED } }),
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(financeService.reverseEarningsOnRefund).toHaveBeenCalledWith(prisma, 1);
    });

    it('does not re-cancel an order that is already CANCELLED', async () => {
      prisma.refund.findUnique.mockResolvedValue({ ...pendingRefund, order: { status: OrderStatus.CANCELLED } });
      prisma.refund.updateMany.mockResolvedValue({ count: 1 });
      prisma.refund.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        orderId: 1,
        amount: 100,
        order: { orderNumber: 'ORD-1', customerId: 5, customer: { email: 'a@b.com', name: 'Ana' } },
      });

      await service.approveRefund(1, 42);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectRefund', () => {
    it('rejects a refund that is not PENDING', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, status: RefundStatus.REJECTED });
      await expect(service.rejectRefund(1, 42, 'no')).rejects.toThrow(BadRequestException);
    });

    it('rejects when the atomic status-guard matches zero rows', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, status: RefundStatus.PENDING });
      prisma.refund.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.rejectRefund(1, 42, 'no')).rejects.toThrow(BadRequestException);
    });

    it('rejects a PENDING refund and notifies the customer', async () => {
      prisma.refund.findUnique.mockResolvedValue({ id: 1, orderId: 1, status: RefundStatus.PENDING });
      prisma.refund.updateMany.mockResolvedValue({ count: 1 });
      prisma.refund.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        orderId: 1,
        amount: 100,
        order: { orderNumber: 'ORD-1', customerId: 5 },
      });

      await service.rejectRefund(1, 42, 'item confirmed delivered in good condition');

      expect(prisma.refund.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: RefundStatus.PENDING },
          data: expect.objectContaining({ status: RefundStatus.REJECTED, adminNote: 'item confirmed delivered in good condition' }),
        }),
      );
      expect(notificationsService.notifyRefundDecision).toHaveBeenCalledWith(
        5, 1, 1, 'ORD-1', 100, false, 'item confirmed delivered in good condition',
      );
    });
  });
});
