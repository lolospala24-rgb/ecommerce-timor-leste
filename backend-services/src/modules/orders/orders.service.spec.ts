import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { ProductsService } from '../products/products.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingService } from '../shipping/shipping.service';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { RefundsService } from '../finance/refunds.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CouponsService } from '../coupons/coupons.service';
import { OrderStatus, PaymentMethod, Role, ShippingStatus } from '@prisma/client';

// Covers the courier/driver + delivery-confirmation logic added this
// session — the exact flows that were, until now, only ever verified by
// hand with curl against production. This is a real regression net for
// that, not a coverage-number exercise: every case here maps to a
// specific "don't let X happen" rule from the delivery-snapshot and
// courier-tracking design (see doc-comments in orders.service.ts).
describe('OrdersService — courier & delivery confirmation', () => {
  let service: OrdersService;
  let prisma: any;
  let notificationsService: any;
  let notificationsGateway: any;
  let financeService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      seller: { findUnique: jest.fn() },
      refund: { findFirst: jest.fn() },
      payment: { update: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    notificationsService = {
      sendNotification: jest.fn(),
      broadcastNotification: jest.fn(),
      sendLowStockAlert: jest.fn(),
    };
    notificationsGateway = {
      emitOrderUpdated: jest.fn(),
      emitOrderCreated: jest.fn(),
    };
    financeService = {
      recordSaleOnPaymentConfirmed: jest.fn(),
      releaseEarningsOnDelivery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), keys: jest.fn().mockResolvedValue([]) } },
        { provide: MailService, useValue: { sendOrderStatusUpdate: jest.fn() } },
        { provide: ProductsService, useValue: { updateStock: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ShippingService, useValue: { calculateShippingCost: jest.fn() } },
        { provide: SettingsService, useValue: {} },
        { provide: FinanceService, useValue: financeService },
        { provide: RefundsService, useValue: {} },
        { provide: NotificationsGateway, useValue: notificationsGateway },
        { provide: CouponsService, useValue: {} },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('assignDriver', () => {
    const baseOrder = { id: 1, orderNumber: 'ORD-1', customerId: 5, sellerId: 9 };

    it('rejects a driverId that is not an active COURIER user', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder);
      prisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.CUSTOMER, isActive: true });

      await expect(
        service.assignDriver(1, { driverId: 2 }, 1, 'ADMIN'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a SELLER trying to assign a driver on another seller\'s order', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder);
      prisma.seller.findUnique.mockResolvedValue({ id: 999 }); // not sellerId 9

      await expect(
        service.assignDriver(1, { driverId: 2 }, 1, 'SELLER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assigns an active COURIER and notifies them', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder);
      const driver = { id: 2, name: 'Driver Joe', phone: '+670123', role: Role.COURIER, isActive: true };
      prisma.user.findUnique.mockResolvedValue(driver);
      prisma.order.update.mockResolvedValue({ ...baseOrder, assignedDriverId: 2, assignedDriver: driver });

      const result = await service.assignDriver(1, { driverId: 2 }, 1, 'ADMIN');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { assignedDriverId: 2 } }),
      );
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2 }),
      );
      expect(notificationsGateway.emitOrderUpdated).toHaveBeenCalled();
      expect(result.assignedDriverId).toBe(2);
    });
  });

  describe('updateCourierLocation', () => {
    it('rejects a driver who is not assigned to the order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, assignedDriverId: 99, customerId: 5 });

      await expect(
        service.updateCourierLocation(1, 42, { latitude: -8.5, longitude: 125.5 }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('updates the live position for the correctly assigned driver', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, assignedDriverId: 42, customerId: 5 });

      const result = await service.updateCourierLocation(1, 42, { latitude: -8.5, longitude: 125.5 });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ courierLatitude: -8.5, courierLongitude: 125.5 }),
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateShippingStatus', () => {
    it('rejects a driver who is not assigned to the order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, assignedDriverId: 99, customerId: 5 });

      await expect(
        service.updateShippingStatus(1, 42, ShippingStatus.IN_TRANSIT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('stamps driverDeliveredAt exactly once when transitioning to DELIVERED, without touching the financial status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: 'ORD-1',
        customerId: 5,
        assignedDriverId: 42,
        driverDeliveredAt: null,
      });
      prisma.order.update.mockResolvedValue({ id: 1, shippingStatus: ShippingStatus.DELIVERED });

      await service.updateShippingStatus(1, 42, ShippingStatus.DELIVERED);

      const updateCall = prisma.order.update.mock.calls[0][0];
      expect(updateCall.data.shippingStatus).toBe(ShippingStatus.DELIVERED);
      expect(updateCall.data.driverDeliveredAt).toBeInstanceOf(Date);
      // The financial OrderStatus field must never appear in this update —
      // that's the whole point of keeping shippingStatus separate.
      expect(updateCall.data.status).toBeUndefined();
    });

    it('does not re-stamp driverDeliveredAt if it is already set', async () => {
      const existingTimestamp = new Date('2026-01-01T00:00:00Z');
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: 'ORD-1',
        customerId: 5,
        assignedDriverId: 42,
        driverDeliveredAt: existingTimestamp,
      });
      prisma.order.update.mockResolvedValue({});

      await service.updateShippingStatus(1, 42, ShippingStatus.DELIVERED);

      const updateCall = prisma.order.update.mock.calls[0][0];
      expect(updateCall.data.driverDeliveredAt).toBeUndefined();
    });
  });

  describe('handleCourierWebhook', () => {
    it('404s for an unknown tracking number', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.handleCourierWebhook({ trackingNumber: 'DOES-NOT-EXIST' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects latitude without longitude', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 1, customerId: 5, driverDeliveredAt: null });

      await expect(
        service.handleCourierWebhook({ trackingNumber: 'ET-1', latitude: -8.5 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a payload with neither status nor coordinates', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 1, customerId: 5, driverDeliveredAt: null });

      await expect(
        service.handleCourierWebhook({ trackingNumber: 'ET-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a status-only update and stamps driverDeliveredAt on DELIVERED', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 1, orderNumber: 'ORD-1', customerId: 5, driverDeliveredAt: null });
      prisma.order.update.mockResolvedValue({});

      await service.handleCourierWebhook({ trackingNumber: 'ET-1', status: ShippingStatus.DELIVERED } as any);

      const updateCall = prisma.order.update.mock.calls[0][0];
      expect(updateCall.data.shippingStatus).toBe(ShippingStatus.DELIVERED);
      expect(updateCall.data.driverDeliveredAt).toBeInstanceOf(Date);
    });
  });

  describe('confirmDelivery / autoConfirmDelivery (shared completeDelivery)', () => {
    it('confirmDelivery rejects a customer confirming someone else\'s order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, customerId: 5, status: OrderStatus.SHIPPING });

      await expect(service.confirmDelivery(1, 999)).rejects.toThrow(ForbiddenException);
    });

    it('confirmDelivery rejects an order that is not SHIPPING', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, customerId: 5, status: OrderStatus.PROCESSING });

      await expect(service.confirmDelivery(1, 5)).rejects.toThrow(BadRequestException);
    });

    it('confirmDelivery marks COD paid and releases earnings for the real owner', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        customerId: 5,
        status: OrderStatus.SHIPPING,
        paymentMethod: PaymentMethod.COD,
      });
      prisma.order.update.mockResolvedValue({ id: 1, status: OrderStatus.DELIVERED });

      await service.confirmDelivery(1, 5);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderId: 1 } }),
      );
      expect(financeService.recordSaleOnPaymentConfirmed).toHaveBeenCalled();
      expect(financeService.releaseEarningsOnDelivery).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OrderStatus.DELIVERED }) }),
      );
    });

    it('autoConfirmDelivery skips an order that already left SHIPPING', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, status: OrderStatus.DELIVERED });

      const result = await service.autoConfirmDelivery(1);

      expect(result).toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('autoConfirmDelivery refuses to close an order with an open refund dispute', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, status: OrderStatus.SHIPPING, customerId: 5 });
      prisma.refund.findFirst.mockResolvedValue({ id: 77 });

      const result = await service.autoConfirmDelivery(1);

      expect(result).toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('autoConfirmDelivery closes the order and notifies the customer when clear of disputes', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: 'ORD-1',
        status: OrderStatus.SHIPPING,
        customerId: 5,
        paymentMethod: PaymentMethod.COD,
      });
      prisma.refund.findFirst.mockResolvedValue(null);
      prisma.order.update.mockResolvedValue({ id: 1, status: OrderStatus.DELIVERED });

      const result = await service.autoConfirmDelivery(1);

      expect(financeService.releaseEarningsOnDelivery).toHaveBeenCalled();
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, data: expect.objectContaining({ autoConfirmed: true }) }),
      );
      expect(result).toEqual(expect.objectContaining({ status: OrderStatus.DELIVERED }));
    });
  });
});
