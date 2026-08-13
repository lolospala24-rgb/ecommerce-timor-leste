import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma, LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

// Rounds to cents. Doesn't eliminate Float drift (see audit §19-20 — the
// schema uses Float, not Decimal), but stops it from compounding across
// the sale -> release -> refund chain, which is the part FinanceService
// actually controls.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type Tx = Prisma.TransactionClient;

/**
 * Single writer of SellerBalance / SellerLedgerEntry. Every financial event
 * that touches a seller's money (sale, release-on-delivery, refund, payout)
 * goes through here so the ledger is a complete, append-only explanation of
 * the balance — never mutate those two tables from anywhere else.
 *
 * One Order always belongs to exactly one Seller (Order.sellerId), because
 * checkout splits a multi-seller cart into one Order per seller
 * (OrdersService.create). There is therefore no cross-seller allocation to
 * do here — an order's commission/net figures apply to its single seller
 * directly.
 */
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  private async getOrCreateBalance(tx: Tx, sellerId: number) {
    const existing = await tx.sellerBalance.findUnique({ where: { sellerId } });
    if (existing) return existing;
    return tx.sellerBalance.create({ data: { sellerId } });
  }

  // Singleton, same convention as SettingsService.getSettings() — findFirst,
  // create on first use. There's exactly one platform, so no lookup key.
  private async getOrCreatePlatformBalance(tx: Tx) {
    const existing = await tx.platformBalance.findFirst();
    if (existing) return existing;
    return tx.platformBalance.create({ data: {} });
  }

  /**
   * Called the moment a Payment transitions to PAID (admin confirm, auto-
   * confirm bank transfer, or COD marked paid on delivery). Snapshots
   * commissionRate/commissionAmount/sellerNetAmount onto the Order — using
   * whatever SystemSettings.defaultCommissionRate is RIGHT NOW — and credits
   * the seller's pending balance with the net amount.
   *
   * Idempotent: if this order already has a commissionRate snapshot, it's
   * a no-op (guards against being called twice for the same order, e.g. if
   * a caller retries after a notification failure downstream).
   */
  async recordSaleOnPaymentConfirmed(tx: Tx, orderId: number) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`recordSaleOnPaymentConfirmed: order ${orderId} not found`);
      return;
    }
    if (order.commissionRate != null) {
      // Already snapshotted — don't re-credit the seller twice for one sale.
      return;
    }

    const settings = await this.settingsService.getSettings();
    const commissionRate = Number(settings.defaultCommissionRate ?? 0);
    const commissionAmount = round2((order.subtotal * commissionRate) / 100);
    const sellerNetAmount = round2(order.subtotal - commissionAmount);

    await tx.order.update({
      where: { id: order.id },
      data: { commissionRate, commissionAmount, sellerNetAmount },
    });

    const balance = await this.getOrCreateBalance(tx, order.sellerId);
    const pendingBalanceAfter = round2(balance.pendingAmount + sellerNetAmount);

    await tx.sellerBalance.update({
      where: { sellerId: order.sellerId },
      data: { pendingAmount: pendingBalanceAfter },
    });

    // Two entries, written together, that always net to sellerNetAmount —
    // the running SellerBalance figure only ever reflects the net; gross
    // and commission are visible in the ledger for reconciliation, not as
    // separate balance states.
    const unchangedBuckets = {
      availableBalanceAfter: round2(balance.availableAmount),
      processingBalanceAfter: round2(balance.processingAmount),
      paidOutBalanceAfter: round2(balance.paidOutAmount),
      refundedBalanceAfter: round2(balance.refundedAmount),
    };

    await tx.sellerLedgerEntry.createMany({
      data: [
        {
          sellerId: order.sellerId,
          orderId: order.id,
          type: LedgerEntryType.SALE,
          pendingDelta: round2(order.subtotal),
          pendingBalanceAfter,
          ...unchangedBuckets,
          note: `Sale — order ${order.orderNumber}, gross $${order.subtotal.toFixed(2)}`,
        },
        {
          sellerId: order.sellerId,
          orderId: order.id,
          type: LedgerEntryType.COMMISSION,
          pendingDelta: round2(-commissionAmount),
          pendingBalanceAfter,
          ...unchangedBuckets,
          note: `Commission — order ${order.orderNumber}, ${commissionRate}% of $${order.subtotal.toFixed(2)}`,
        },
      ],
    });

    await this.creditPlatformOnSale(tx, order, commissionAmount);
  }

  // Commission becomes recognized platform revenue the same moment it's
  // deducted from the seller's sale. Shipping and tax were collected from
  // the customer (folded into Payment.amount alongside the product amount)
  // but previously had no tracked destination at all once payment cleared —
  // this is what gives them one, using the same ledger pattern as the
  // seller side just above instead of a separate mechanism.
  private async creditPlatformOnSale(
    tx: Tx,
    order: { id: number; orderNumber: string; shippingCost: number; taxAmount: number },
    commissionAmount: number,
  ) {
    const balance = await this.getOrCreatePlatformBalance(tx);
    const commissionBalanceAfter = round2(balance.commissionRevenue + commissionAmount);
    const shippingHeldBalanceAfter = round2(balance.shippingHeld + order.shippingCost);
    const taxHeldBalanceAfter = round2(balance.taxHeld + order.taxAmount);

    await tx.platformBalance.update({
      where: { id: balance.id },
      data: {
        commissionRevenue: commissionBalanceAfter,
        shippingHeld: shippingHeldBalanceAfter,
        taxHeld: taxHeldBalanceAfter,
      },
    });

    const unchangedPlatformBuckets = {
      shippingRemittedBalanceAfter: round2(balance.shippingRemitted),
      taxRemittedBalanceAfter: round2(balance.taxRemitted),
    };

    const entries: Prisma.PlatformLedgerEntryCreateManyInput[] = [
      {
        orderId: order.id,
        type: 'COMMISSION',
        commissionDelta: round2(commissionAmount),
        commissionBalanceAfter,
        shippingHeldBalanceAfter: round2(balance.shippingHeld),
        taxHeldBalanceAfter: round2(balance.taxHeld),
        ...unchangedPlatformBuckets,
        note: `Commission revenue — order ${order.orderNumber}`,
      },
    ];

    if (order.shippingCost > 0) {
      entries.push({
        orderId: order.id,
        type: 'SHIPPING_COLLECTED',
        shippingHeldDelta: round2(order.shippingCost),
        commissionBalanceAfter,
        shippingHeldBalanceAfter,
        taxHeldBalanceAfter: round2(balance.taxHeld),
        ...unchangedPlatformBuckets,
        note: `Shipping collected — order ${order.orderNumber}, $${order.shippingCost.toFixed(2)} held pending remittance to courier`,
      });
    }

    if (order.taxAmount > 0) {
      entries.push({
        orderId: order.id,
        type: 'TAX_COLLECTED',
        taxHeldDelta: round2(order.taxAmount),
        commissionBalanceAfter,
        shippingHeldBalanceAfter,
        taxHeldBalanceAfter,
        ...unchangedPlatformBuckets,
        note: `Tax collected — order ${order.orderNumber}, $${order.taxAmount.toFixed(2)} held pending remittance`,
      });
    }

    await tx.platformLedgerEntry.createMany({ data: entries });
  }

  /**
   * Called when an Order reaches DELIVERED. Moves that order's net earnings
   * from pending to available. If the order's Payment only became PAID at
   * this exact moment (COD — paid-on-delivery), the caller must invoke
   * recordSaleOnPaymentConfirmed() first, in the same transaction, so
   * sellerNetAmount exists to release.
   *
   * Idempotent: a RELEASE ledger entry already existing for this order
   * means it's already been released — no-op.
   */
  async releaseEarningsOnDelivery(tx: Tx, orderId: number) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.sellerNetAmount == null) {
      // No confirmed sale to release (e.g. order delivered with no
      // successful payment at all — shouldn't happen, but never throw for
      // this from inside a status-update transaction).
      return;
    }

    const alreadyReleased = await tx.sellerLedgerEntry.findFirst({
      where: { orderId: order.id, type: LedgerEntryType.RELEASE },
    });
    if (alreadyReleased) return;

    const balance = await this.getOrCreateBalance(tx, order.sellerId);
    const net = order.sellerNetAmount;
    const pendingBalanceAfter = round2(balance.pendingAmount - net);
    const availableBalanceAfter = round2(balance.availableAmount + net);

    await tx.sellerBalance.update({
      where: { sellerId: order.sellerId },
      data: { pendingAmount: pendingBalanceAfter, availableAmount: availableBalanceAfter },
    });

    await tx.sellerLedgerEntry.create({
      data: {
        sellerId: order.sellerId,
        orderId: order.id,
        type: LedgerEntryType.RELEASE,
        pendingDelta: round2(-net),
        availableDelta: round2(net),
        pendingBalanceAfter,
        availableBalanceAfter,
        processingBalanceAfter: round2(balance.processingAmount),
        paidOutBalanceAfter: round2(balance.paidOutAmount),
        refundedBalanceAfter: round2(balance.refundedAmount),
        note: `Released to available — order ${order.orderNumber} delivered ($${net.toFixed(2)} moved from pending to available)`,
      },
    });
  }

  /**
   * Reverses the seller's net share of a refund, proportional to
   * refund.amount / order.total. Deducts from whichever bucket currently
   * holds the order's earnings (available if already released on delivery,
   * otherwise pending). Deliberately allows the balance to go negative
   * rather than blocking the refund — a refund can legitimately exceed what's
   * left if the seller was already paid out; that shortfall needs manual
   * reconciliation (flagged in the ledger note), not a hard failure that
   * would leave a customer un-refunded over a bookkeeping edge case.
   *
   * Also reverses the platform's commission on the same proportion (resolves
   * the previously-open "is commission reversed on refund" business
   * decision — yes, proportionally). This has no SellerBalance bucket to
   * move through (commission was never credited to the seller), so it's
   * persisted directly on Refund.commissionReversed and recorded as a
   * zero-delta COMMISSION_REVERSAL ledger entry for a complete audit trail;
   * Finance Overview reads the persisted sum instead of estimating it.
   */
  async reverseEarningsOnRefund(tx: Tx, refundId: number) {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      throw new Error(`reverseEarningsOnRefund: refund ${refundId} not found`);
    }

    const order = await tx.order.findUnique({ where: { id: refund.orderId } });
    if (!order || order.sellerNetAmount == null || order.commissionAmount == null) {
      // Nothing was ever credited to the seller for this order (e.g.
      // payment was never confirmed) — nothing to reverse.
      return;
    }

    const orderTotal = order.total ?? order.subtotal;
    const proportion = orderTotal > 0 ? Math.min(refund.amount / orderTotal, 1) : 0;
    const reversedNet = round2(order.sellerNetAmount * proportion);
    const reversedCommission = round2(order.commissionAmount * proportion);

    const released = await tx.sellerLedgerEntry.findFirst({
      where: { orderId: order.id, type: LedgerEntryType.RELEASE },
    });

    const balance = await this.getOrCreateBalance(tx, order.sellerId);
    const fromAvailable = !!released;

    const pendingBalanceAfter = fromAvailable
      ? round2(balance.pendingAmount)
      : round2(balance.pendingAmount - reversedNet);
    const availableBalanceAfter = fromAvailable
      ? round2(balance.availableAmount - reversedNet)
      : round2(balance.availableAmount);

    const wentNegative = pendingBalanceAfter < 0 || availableBalanceAfter < 0;
    const refundedBalanceAfter = round2(balance.refundedAmount + reversedNet);

    await tx.sellerBalance.update({
      where: { sellerId: order.sellerId },
      data: {
        pendingAmount: pendingBalanceAfter,
        availableAmount: availableBalanceAfter,
        refundedAmount: refundedBalanceAfter,
      },
    });

    await tx.sellerLedgerEntry.create({
      data: {
        sellerId: order.sellerId,
        orderId: order.id,
        refundId: refund.id,
        type: LedgerEntryType.REFUND,
        pendingDelta: fromAvailable ? 0 : round2(-reversedNet),
        availableDelta: fromAvailable ? round2(-reversedNet) : 0,
        refundedDelta: round2(reversedNet),
        pendingBalanceAfter,
        availableBalanceAfter,
        processingBalanceAfter: round2(balance.processingAmount),
        paidOutBalanceAfter: round2(balance.paidOutAmount),
        refundedBalanceAfter,
        note: wentNegative
          ? `Refund — order ${order.orderNumber}, reversed $${reversedNet.toFixed(2)} of seller's net. ` +
            `Balance went negative — funds already paid out exceed this reversal; needs manual reconciliation.`
          : `Refund — order ${order.orderNumber}, reversed $${reversedNet.toFixed(2)} of seller's net`,
      },
    });

    await tx.refund.update({
      where: { id: refund.id },
      data: { commissionReversed: reversedCommission },
    });

    if (reversedCommission > 0) {
      await tx.sellerLedgerEntry.create({
        data: {
          sellerId: order.sellerId,
          orderId: order.id,
          refundId: refund.id,
          type: LedgerEntryType.COMMISSION_REVERSAL,
          // No bucket deltas — commission was platform revenue, never a
          // seller-balance line item, so there's nothing to move back. This
          // entry exists purely so the ledger records the event completely.
          pendingBalanceAfter,
          availableBalanceAfter,
          processingBalanceAfter: round2(balance.processingAmount),
          paidOutBalanceAfter: round2(balance.paidOutAmount),
          refundedBalanceAfter,
          note: `Commission reversed — order ${order.orderNumber}, $${reversedCommission.toFixed(2)} (${(proportion * 100).toFixed(1)}% of $${order.commissionAmount.toFixed(2)}) no longer counted as platform revenue`,
        },
      });
    }

    await this.reversePlatformOnRefund(tx, order, refund, proportion, reversedCommission);

    return { reversedNet, reversedCommission, wentNegative };
  }

  // Platform-side counterpart to the seller reversal just above — reverses
  // commission revenue, and the same proportion of shipping/tax that was
  // held for this order, out of PlatformBalance. This is a REAL balance
  // movement (unlike the zero-delta SellerLedgerEntry.COMMISSION_REVERSAL
  // audit entry above, which has nothing to move since commission was never
  // a seller bucket) — commission/shipping/tax genuinely were credited to
  // PlatformBalance in creditPlatformOnSale(), so a refund must actually
  // take them back out.
  private async reversePlatformOnRefund(
    tx: Tx,
    order: { id: number; orderNumber: string; shippingCost: number; taxAmount: number },
    refund: { id: number },
    proportion: number,
    reversedCommission: number,
  ) {
    const reversedShipping = round2(order.shippingCost * proportion);
    const reversedTax = round2(order.taxAmount * proportion);
    if (reversedCommission === 0 && reversedShipping === 0 && reversedTax === 0) return;

    const balance = await this.getOrCreatePlatformBalance(tx);
    const commissionBalanceAfter = round2(balance.commissionRevenue - reversedCommission);
    const shippingHeldBalanceAfter = round2(balance.shippingHeld - reversedShipping);
    const taxHeldBalanceAfter = round2(balance.taxHeld - reversedTax);

    await tx.platformBalance.update({
      where: { id: balance.id },
      data: {
        commissionRevenue: commissionBalanceAfter,
        shippingHeld: shippingHeldBalanceAfter,
        taxHeld: taxHeldBalanceAfter,
      },
    });

    const unchangedPlatformBuckets = {
      shippingRemittedBalanceAfter: round2(balance.shippingRemitted),
      taxRemittedBalanceAfter: round2(balance.taxRemitted),
    };

    const entries: Prisma.PlatformLedgerEntryCreateManyInput[] = [];

    if (reversedCommission > 0) {
      entries.push({
        orderId: order.id,
        refundId: refund.id,
        type: 'COMMISSION_REVERSAL',
        commissionDelta: round2(-reversedCommission),
        commissionBalanceAfter,
        shippingHeldBalanceAfter: round2(balance.shippingHeld),
        taxHeldBalanceAfter: round2(balance.taxHeld),
        ...unchangedPlatformBuckets,
        note: `Commission reversed — order ${order.orderNumber}, refund #${refund.id}`,
      });
    }
    if (reversedShipping > 0) {
      entries.push({
        orderId: order.id,
        refundId: refund.id,
        type: 'SHIPPING_REVERSAL',
        shippingHeldDelta: round2(-reversedShipping),
        commissionBalanceAfter,
        shippingHeldBalanceAfter,
        taxHeldBalanceAfter: round2(balance.taxHeld),
        ...unchangedPlatformBuckets,
        note: `Shipping reversed — order ${order.orderNumber}, refund #${refund.id}, $${reversedShipping.toFixed(2)}`,
      });
    }
    if (reversedTax > 0) {
      entries.push({
        orderId: order.id,
        refundId: refund.id,
        type: 'TAX_REVERSAL',
        taxHeldDelta: round2(-reversedTax),
        commissionBalanceAfter,
        shippingHeldBalanceAfter,
        taxHeldBalanceAfter,
        ...unchangedPlatformBuckets,
        note: `Tax reversed — order ${order.orderNumber}, refund #${refund.id}, $${reversedTax.toFixed(2)}`,
      });
    }

    if (entries.length > 0) {
      await tx.platformLedgerEntry.createMany({ data: entries });
    }
  }

  // ==========================================================================
  // Admin Financial Command Center — read-side aggregates. Every number here
  // is derived from the SAME tables FinanceService itself writes (Order
  // commission snapshot, SellerBalance, SellerLedgerEntry, Refund) — this is
  // deliberately NOT a second, independently-computed source of truth. If a
  // number here disagrees with the ledger, that's a real bug to find via
  // getReconciliation(), not a sign the two code paths drifted apart.
  // ==========================================================================

  async getOverview(filters?: { startDate?: Date; endDate?: Date }) {
    const dateFilter =
      filters?.startDate && filters?.endDate
        ? { createdAt: { gte: filters.startDate, lte: filters.endDate } }
        : {};

    const [salesAgg, balanceAgg, approvedRefunds, shippingTaxAgg, platformBalance] = await Promise.all([
      // Only orders that actually had a payment confirmed (commissionRate
      // is null until then) count as a sale — an unpaid PENDING order isn't
      // revenue yet.
      this.prisma.order.aggregate({
        where: { commissionRate: { not: null }, ...dateFilter },
        _sum: { subtotal: true, commissionAmount: true, sellerNetAmount: true },
        _count: true,
      }),
      this.prisma.sellerBalance.aggregate({
        _sum: {
          pendingAmount: true,
          availableAmount: true,
          processingAmount: true,
          paidOutAmount: true,
          refundedAmount: true,
        },
      }),
      this.prisma.refund.findMany({
        where: { status: 'APPROVED', ...(filters?.startDate && filters?.endDate ? { processedAt: { gte: filters.startDate, lte: filters.endDate } } : {}) },
        select: { amount: true, commissionReversed: true, order: { select: { subtotal: true, total: true, commissionAmount: true } } },
      }),
      // Same period-scoped shape as salesAgg, for "how much shipping/tax was
      // collected this period" — separate from platformBalance below, which
      // is the current, unscoped running total (mirrors how sellerEarnings'
      // pending/available/etc are also current-state, not period-scoped).
      this.prisma.order.aggregate({
        where: { commissionRate: { not: null }, ...dateFilter },
        _sum: { shippingCost: true, taxAmount: true },
      }),
      this.getOrCreatePlatformBalance(this.prisma as unknown as Tx),
    ]);

    const grossSales = round2(salesAgg._sum.subtotal || 0);
    const platformCommission = round2(salesAgg._sum.commissionAmount || 0);
    const sellerEarnings = round2(salesAgg._sum.sellerNetAmount || 0);

    // Refunded amount, and the slice of platform commission that rode along
    // with it. The subtotal portion is still computed here at query time
    // (there's no persisted field for it, and it only feeds "Net Sales",
    // a display-only figure) — but the commission portion is now the REAL
    // value FinanceService.reverseEarningsOnRefund persisted onto each
    // Refund.commissionReversed at approval time, not an estimate.
    let refundedSubtotalPortion = 0;
    for (const r of approvedRefunds) {
      const orderTotal = r.order?.total || 0;
      const proportion = orderTotal > 0 ? Math.min(r.amount / orderTotal, 1) : 0;
      refundedSubtotalPortion += (r.order?.subtotal || 0) * proportion;
    }
    refundedSubtotalPortion = round2(refundedSubtotalPortion);
    const refundedCommissionPortion = round2(
      approvedRefunds.reduce((sum: number, r: (typeof approvedRefunds)[number]) => sum + (r.commissionReversed || 0), 0),
    );
    const totalRefunded = round2(approvedRefunds.reduce((s, r) => s + r.amount, 0));

    return {
      period: filters?.startDate && filters?.endDate ? { startDate: filters.startDate, endDate: filters.endDate } : null,
      sales: {
        grossSales,
        netSales: round2(grossSales - refundedSubtotalPortion),
        orderCount: salesAgg._count,
      },
      commission: {
        platformCommission,
        commissionRefundedPortion: refundedCommissionPortion,
        note: 'Commission is reversed proportionally on approved refunds (Refund.commissionReversed, set at approval time) — this is the real deducted amount, not an estimate.',
      },
      sellerEarnings: {
        total: sellerEarnings,
        pending: round2(balanceAgg._sum.pendingAmount || 0),
        available: round2(balanceAgg._sum.availableAmount || 0),
        processing: round2(balanceAgg._sum.processingAmount || 0),
        paidOut: round2(balanceAgg._sum.paidOutAmount || 0),
        refunded: round2(balanceAgg._sum.refundedAmount || 0),
      },
      refunds: {
        total: totalRefunded,
      },
      platformRevenue: {
        gross: platformCommission,
        net: round2(platformCommission - refundedCommissionPortion),
      },
      // Shipping/tax collected THIS PERIOD — separate from platformBalance
      // below, which is the current running total across all time.
      shippingTax: {
        shippingCollected: round2(shippingTaxAgg._sum.shippingCost || 0),
        taxCollected: round2(shippingTaxAgg._sum.taxAmount || 0),
      },
      // Current, unscoped state of PlatformBalance — where shipping and tax
      // money collected from customers actually sits right now, and how
      // much of it has been remitted (paid out to a courier / tax
      // authority) via a manual FinanceService.recordPlatformRemittance
      // action. This is the answer to "shipping $X went where?" that,
      // before this, had no tracked destination at all.
      platformBalance: {
        commissionRevenue: round2(platformBalance.commissionRevenue),
        shippingHeld: round2(platformBalance.shippingHeld),
        shippingRemitted: round2(platformBalance.shippingRemitted),
        taxHeld: round2(platformBalance.taxHeld),
        taxRemitted: round2(platformBalance.taxRemitted),
      },
    };
  }

  async getGlobalLedger(filters: {
    sellerId?: number;
    type?: LedgerEntryType;
    page: number;
    limit: number;
  }) {
    const { sellerId, type, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.SellerLedgerEntryWhereInput = {
      ...(sellerId ? { sellerId } : {}),
      ...(type ? { type } : {}),
    };

    const [entries, total] = await Promise.all([
      this.prisma.sellerLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { storeName: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      this.prisma.sellerLedgerEntry.count({ where }),
    ]);

    return { data: entries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getPlatformBalance() {
    const balance = await this.getOrCreatePlatformBalance(this.prisma as unknown as Tx);
    return {
      commissionRevenue: round2(balance.commissionRevenue),
      shippingHeld: round2(balance.shippingHeld),
      shippingRemitted: round2(balance.shippingRemitted),
      taxHeld: round2(balance.taxHeld),
      taxRemitted: round2(balance.taxRemitted),
      updatedAt: balance.updatedAt,
    };
  }

  async getPlatformLedger(filters: {
    type?: Prisma.PlatformLedgerEntryWhereInput['type'];
    page: number;
    limit: number;
  }) {
    const { type, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.PlatformLedgerEntryWhereInput = {
      ...(type ? { type } : {}),
    };

    const [entries, total] = await Promise.all([
      this.prisma.platformLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true } },
        },
      }),
      this.prisma.platformLedgerEntry.count({ where }),
    ]);

    return { data: entries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Manual admin action recording money actually paid out of a "held"
   * platform bucket — shipping remitted to a courier, or tax remitted to
   * the tax authority. This app has no courier-invoicing or tax-filing
   * integration, so there's no automated trigger for this; an admin
   * records it after paying outside the system, the same way a bank
   * transfer payout is recorded after the admin actually sends the money.
   */
  async recordPlatformRemittance(
    bucket: 'shipping' | 'tax',
    amount: number,
    reason: string,
    adminId: number,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Remittance amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.getOrCreatePlatformBalance(tx);
      const heldField = bucket === 'shipping' ? 'shippingHeld' : 'taxHeld';
      const remittedField = bucket === 'shipping' ? 'shippingRemitted' : 'taxRemitted';
      const roundedAmount = round2(amount);

      // Unlike a seller refund (which can legitimately exceed what's left
      // and go negative — money already paid out), there's no equivalent
      // legitimate case for remitting more than what's currently held: it's
      // always either a typo or paying the same invoice twice. Block it
      // server-side rather than trusting the admin UI's client-side check.
      if (roundedAmount > (balance as any)[heldField] + 0.01) {
        throw new BadRequestException(
          `Cannot remit $${roundedAmount.toFixed(2)} — only $${(balance as any)[heldField].toFixed(2)} is currently held for ${bucket}`,
        );
      }

      const heldBalanceAfter = round2((balance as any)[heldField] - roundedAmount);
      const remittedBalanceAfter = round2((balance as any)[remittedField] + roundedAmount);

      const updated = await tx.platformBalance.update({
        where: { id: balance.id },
        data: { [heldField]: heldBalanceAfter, [remittedField]: remittedBalanceAfter },
      });

      const entry = await tx.platformLedgerEntry.create({
        data: {
          type: 'REMITTANCE',
          [bucket === 'shipping' ? 'shippingHeldDelta' : 'taxHeldDelta']: round2(-roundedAmount),
          [bucket === 'shipping' ? 'shippingRemittedDelta' : 'taxRemittedDelta']: roundedAmount,
          commissionBalanceAfter: round2(updated.commissionRevenue),
          shippingHeldBalanceAfter: round2(updated.shippingHeld),
          shippingRemittedBalanceAfter: round2(updated.shippingRemitted),
          taxHeldBalanceAfter: round2(updated.taxHeld),
          taxRemittedBalanceAfter: round2(updated.taxRemitted),
          note: `Remittance (${bucket}) by admin: $${roundedAmount.toFixed(2)} — ${reason}`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'PLATFORM_REMITTANCE',
          targetType: 'PLATFORM_BALANCE',
          targetId: balance.id,
          details: { bucket, amount: roundedAmount, reason, ledgerEntryId: entry.id },
        },
      });

      return entry;
    });
  }

  /**
   * Manual correction to PlatformBalance, mirroring FinanceService.
   * createAdjustment() for sellers. Unlike seller adjustments (which
   * exclude `processing` because that bucket is tightly coupled to the
   * Payout state machine and structurally can't drift outside it),
   * shippingRemitted/taxRemitted ARE adjustable here — recordPlatformRemittance
   * is a single manual admin action with no state machine behind it at all,
   * so a wrong amount or wrong bucket is a realistic mistake with no other
   * correction path once it's been recorded.
   */
  async createPlatformAdjustment(
    bucket: 'commission' | 'shippingHeld' | 'shippingRemitted' | 'taxHeld' | 'taxRemitted',
    amount: number,
    reason: string,
    adminId: number,
  ) {
    const bucketField = {
      commission: 'commissionRevenue',
      shippingHeld: 'shippingHeld',
      shippingRemitted: 'shippingRemitted',
      taxHeld: 'taxHeld',
      taxRemitted: 'taxRemitted',
    }[bucket] as 'commissionRevenue' | 'shippingHeld' | 'shippingRemitted' | 'taxHeld' | 'taxRemitted';

    const deltaField = {
      commission: 'commissionDelta',
      shippingHeld: 'shippingHeldDelta',
      shippingRemitted: 'shippingRemittedDelta',
      taxHeld: 'taxHeldDelta',
      taxRemitted: 'taxRemittedDelta',
    }[bucket] as 'commissionDelta' | 'shippingHeldDelta' | 'shippingRemittedDelta' | 'taxHeldDelta' | 'taxRemittedDelta';

    const roundedAmount = round2(amount);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.getOrCreatePlatformBalance(tx);
      const newValue = round2((balance as any)[bucketField] + roundedAmount);

      const updated = await tx.platformBalance.update({
        where: { id: balance.id },
        data: { [bucketField]: newValue },
      });

      const entry = await tx.platformLedgerEntry.create({
        data: {
          type: 'ADJUSTMENT',
          [deltaField]: roundedAmount,
          commissionBalanceAfter: round2(updated.commissionRevenue),
          shippingHeldBalanceAfter: round2(updated.shippingHeld),
          shippingRemittedBalanceAfter: round2(updated.shippingRemitted),
          taxHeldBalanceAfter: round2(updated.taxHeld),
          taxRemittedBalanceAfter: round2(updated.taxRemitted),
          note: `Manual adjustment (${bucket}) by admin: ${reason}`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'CREATE_PLATFORM_ADJUSTMENT',
          targetType: 'PLATFORM_BALANCE',
          targetId: balance.id,
          details: { bucket, amount: roundedAmount, reason, ledgerEntryId: entry.id },
        },
      });

      return entry;
    });
  }

  /**
   * Sellers currently sitting negative on availableAmount — the expected,
   * self-healing outcome of SOP-08 (refund after payout), not an error
   * state by itself. A payout naturally can't be requested again until new
   * sales bring this back above zero (PayoutsService requires
   * amount ≤ availableAmount) — this is purely visibility into who that
   * applies to right now, not an active collection mechanism.
   */
  async getNegativeBalanceSellers() {
    const balances = await this.prisma.sellerBalance.findMany({
      where: { availableAmount: { lt: 0 } },
      include: { seller: { select: { storeName: true } } },
      orderBy: { availableAmount: 'asc' },
    });
    return balances.map((b) => ({
      sellerId: b.sellerId,
      storeName: b.seller?.storeName,
      availableAmount: round2(b.availableAmount),
    }));
  }

  /**
   * Cross-checks the cached SellerBalance figures against what their own
   * ledger entries actually sum to — the single most important integrity
   * check for a system whose whole design rests on "the ledger is the
   * source of truth, the balance is a maintained projection of it". Also
   * flags a couple of known orphan patterns (a confirmed payment with no
   * SALE ledger row; an approved refund with no REFUND ledger row).
   */
  async getReconciliation() {
    const [balances, ledgerSums, sellersCount] = await Promise.all([
      this.prisma.sellerBalance.findMany({ include: { seller: { select: { storeName: true } } } }),
      this.prisma.sellerLedgerEntry.groupBy({
        by: ['sellerId'],
        _sum: { pendingDelta: true, availableDelta: true, processingDelta: true, paidOutDelta: true, refundedDelta: true },
      }),
      this.prisma.seller.count(),
    ]);

    const ledgerBySeller = new Map(ledgerSums.map((l) => [l.sellerId, l._sum]));
    const mismatches: any[] = [];

    for (const balance of balances) {
      const computed = ledgerBySeller.get(balance.sellerId) || {
        pendingDelta: 0, availableDelta: 0, processingDelta: 0, paidOutDelta: 0, refundedDelta: 0,
      };
      const diffs = {
        pending: round2(balance.pendingAmount - (computed.pendingDelta || 0)),
        available: round2(balance.availableAmount - (computed.availableDelta || 0)),
        processing: round2(balance.processingAmount - (computed.processingDelta || 0)),
        paidOut: round2(balance.paidOutAmount - (computed.paidOutDelta || 0)),
        refunded: round2(balance.refundedAmount - (computed.refundedDelta || 0)),
      };
      const hasMismatch = Object.values(diffs).some((d) => Math.abs(d) > 0.01);
      if (hasMismatch) {
        mismatches.push({
          sellerId: balance.sellerId,
          storeName: balance.seller?.storeName,
          storedBalance: {
            pending: balance.pendingAmount, available: balance.availableAmount,
            processing: balance.processingAmount, paidOut: balance.paidOutAmount, refunded: balance.refundedAmount,
          },
          ledgerSum: computed,
          diffs,
        });
      }
    }

    // Orphan check 1: payment confirmed (order has a commission snapshot)
    // but somehow no SALE ledger entry exists for that order.
    const ordersWithCommission = await this.prisma.order.findMany({
      where: { commissionRate: { not: null } },
      select: { id: true, orderNumber: true, sellerId: true },
    });
    const salesLedgerOrderIds = new Set(
      (await this.prisma.sellerLedgerEntry.findMany({
        where: { type: LedgerEntryType.SALE, orderId: { in: ordersWithCommission.map((o) => o.id) } },
        select: { orderId: true },
      })).map((e) => e.orderId),
    );
    const missingSaleLedger = ordersWithCommission.filter((o) => !salesLedgerOrderIds.has(o.id));

    // Orphan check 2: an approved refund with no REFUND ledger entry.
    const approvedRefunds = await this.prisma.refund.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, orderId: true, amount: true },
    });
    const refundLedgerRefundIds = new Set(
      (await this.prisma.sellerLedgerEntry.findMany({
        where: { type: LedgerEntryType.REFUND, refundId: { in: approvedRefunds.map((r) => r.id) } },
        select: { refundId: true },
      })).map((e) => e.refundId),
    );
    const missingRefundLedger = approvedRefunds.filter((r) => !refundLedgerRefundIds.has(r.id));

    // Same cross-check as the seller loop above, applied to the single
    // PlatformBalance row against the sum of its own PlatformLedgerEntry
    // deltas.
    const [platformBalance, platformLedgerSum] = await Promise.all([
      this.getOrCreatePlatformBalance(this.prisma as unknown as Tx),
      this.prisma.platformLedgerEntry.aggregate({
        _sum: {
          commissionDelta: true,
          shippingHeldDelta: true,
          shippingRemittedDelta: true,
          taxHeldDelta: true,
          taxRemittedDelta: true,
        },
      }),
    ]);
    const platformComputed = {
      commissionDelta: platformLedgerSum._sum.commissionDelta || 0,
      shippingHeldDelta: platformLedgerSum._sum.shippingHeldDelta || 0,
      shippingRemittedDelta: platformLedgerSum._sum.shippingRemittedDelta || 0,
      taxHeldDelta: platformLedgerSum._sum.taxHeldDelta || 0,
      taxRemittedDelta: platformLedgerSum._sum.taxRemittedDelta || 0,
    };
    const platformDiffs = {
      commissionRevenue: round2(platformBalance.commissionRevenue - platformComputed.commissionDelta),
      shippingHeld: round2(platformBalance.shippingHeld - platformComputed.shippingHeldDelta),
      shippingRemitted: round2(platformBalance.shippingRemitted - platformComputed.shippingRemittedDelta),
      taxHeld: round2(platformBalance.taxHeld - platformComputed.taxHeldDelta),
      taxRemitted: round2(platformBalance.taxRemitted - platformComputed.taxRemittedDelta),
    };
    const platformHasMismatch = Object.values(platformDiffs).some((d) => Math.abs(d) > 0.01);
    const platformBalanceMismatch = platformHasMismatch
      ? {
          storedBalance: {
            commissionRevenue: platformBalance.commissionRevenue,
            shippingHeld: platformBalance.shippingHeld,
            shippingRemitted: platformBalance.shippingRemitted,
            taxHeld: platformBalance.taxHeld,
            taxRemitted: platformBalance.taxRemitted,
          },
          ledgerSum: platformComputed,
          diffs: platformDiffs,
        }
      : null;

    // Orphan check 3: an order with a commission snapshot but no COMMISSION
    // platform-ledger entry — the platform-side counterpart to check 1.
    const platformLedgerOrderIds = new Set(
      (await this.prisma.platformLedgerEntry.findMany({
        where: { type: 'COMMISSION', orderId: { in: ordersWithCommission.map((o) => o.id) } },
        select: { orderId: true },
      })).map((e) => e.orderId),
    );
    const missingPlatformLedger = ordersWithCommission.filter((o) => !platformLedgerOrderIds.has(o.id));

    return {
      sellersChecked: sellersCount,
      balanceMismatches: mismatches,
      missingSaleLedgerEntries: missingSaleLedger,
      missingRefundLedgerEntries: missingRefundLedger,
      platformBalanceMismatch,
      missingPlatformLedgerEntries: missingPlatformLedger,
      status:
        mismatches.length === 0 &&
        missingSaleLedger.length === 0 &&
        missingRefundLedger.length === 0 &&
        !platformHasMismatch &&
        missingPlatformLedger.length === 0
          ? 'CLEAN'
          : 'ISSUES_FOUND',
    };
  }

  /**
   * Manual admin correction. Deliberately excludes `processing` — that
   * bucket's whole meaning is "reserved by an in-flight Payout row", and a
   * manual edit to it would desync from the Payout lifecycle that's the
   * only other thing allowed to touch it (see PayoutsService). Pending/
   * available/paidOut/refunded are fair game for correcting a genuine
   * bookkeeping error, always with a mandatory reason and full audit trail.
   */
  async createAdjustment(
    sellerId: number,
    bucket: 'pending' | 'available' | 'paidOut' | 'refunded',
    amount: number,
    reason: string,
    adminId: number,
  ) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error('Seller not found');

    const bucketField = {
      pending: 'pendingAmount',
      available: 'availableAmount',
      paidOut: 'paidOutAmount',
      refunded: 'refundedAmount',
    }[bucket] as 'pendingAmount' | 'availableAmount' | 'paidOutAmount' | 'refundedAmount';

    const deltaField = {
      pending: 'pendingDelta',
      available: 'availableDelta',
      paidOut: 'paidOutDelta',
      refunded: 'refundedDelta',
    }[bucket] as 'pendingDelta' | 'availableDelta' | 'paidOutDelta' | 'refundedDelta';

    const balanceAfterField = {
      pending: 'pendingBalanceAfter',
      available: 'availableBalanceAfter',
      paidOut: 'paidOutBalanceAfter',
      refunded: 'refundedBalanceAfter',
    }[bucket] as 'pendingBalanceAfter' | 'availableBalanceAfter' | 'paidOutBalanceAfter' | 'refundedBalanceAfter';

    const roundedAmount = round2(amount);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.getOrCreateBalance(tx, sellerId);
      const newValue = round2((balance as any)[bucketField] + roundedAmount);

      const updated = await tx.sellerBalance.update({
        where: { sellerId },
        data: { [bucketField]: newValue },
      });

      const entry = await tx.sellerLedgerEntry.create({
        data: {
          sellerId,
          type: LedgerEntryType.ADJUSTMENT,
          [deltaField]: roundedAmount,
          pendingBalanceAfter: round2(updated.pendingAmount),
          availableBalanceAfter: round2(updated.availableAmount),
          processingBalanceAfter: round2(updated.processingAmount),
          paidOutBalanceAfter: round2(updated.paidOutAmount),
          refundedBalanceAfter: round2(updated.refundedAmount),
          note: `Manual adjustment (${bucket}) by admin: ${reason}`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'CREATE_ADJUSTMENT',
          targetType: 'SELLER_BALANCE',
          targetId: sellerId,
          details: { bucket, amount: roundedAmount, reason, ledgerEntryId: entry.id },
        },
      });

      return entry;
    });
  }

  /**
   * Closes a PRE-EXISTING gap between a seller's stored balance bucket and
   * what its own ledger already sums to — the one thing createAdjustment()
   * structurally cannot do (an Adjustment's delta always moves stored and
   * ledger together, which preserves any gap between them, never closes
   * it — see SOP-09/14). Sets stored directly to the ledger-implied value,
   * then writes a delta=0 RESYNC entry as a dated, attributed record of the
   * correction. Because the entry is zero-delta, the ledger sum is
   * unaffected by writing it — stored now equals ledger sum, and Reconciliation
   * goes clean for this bucket immediately after.
   */
  async resyncBalance(
    sellerId: number,
    bucket: 'pending' | 'available' | 'paidOut' | 'refunded',
    reason: string,
    adminId: number,
  ) {
    const bucketField = {
      pending: 'pendingAmount',
      available: 'availableAmount',
      paidOut: 'paidOutAmount',
      refunded: 'refundedAmount',
    }[bucket] as 'pendingAmount' | 'availableAmount' | 'paidOutAmount' | 'refundedAmount';

    const deltaField = {
      pending: 'pendingDelta',
      available: 'availableDelta',
      paidOut: 'paidOutDelta',
      refunded: 'refundedDelta',
    }[bucket] as 'pendingDelta' | 'availableDelta' | 'paidOutDelta' | 'refundedDelta';

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.getOrCreateBalance(tx, sellerId);
      const oldValue = round2((balance as any)[bucketField]);

      const ledgerSum = await tx.sellerLedgerEntry.aggregate({
        where: { sellerId },
        _sum: { [deltaField]: true },
      });
      const ledgerImpliedValue = round2(((ledgerSum._sum as any)[deltaField]) || 0);

      const updated = await tx.sellerBalance.update({
        where: { sellerId },
        data: { [bucketField]: ledgerImpliedValue },
      });

      const entry = await tx.sellerLedgerEntry.create({
        data: {
          sellerId,
          type: LedgerEntryType.RESYNC,
          // Deliberately no delta on any bucket — see method doc comment.
          pendingBalanceAfter: round2(updated.pendingAmount),
          availableBalanceAfter: round2(updated.availableAmount),
          processingBalanceAfter: round2(updated.processingAmount),
          paidOutBalanceAfter: round2(updated.paidOutAmount),
          refundedBalanceAfter: round2(updated.refundedAmount),
          note: `Resync (${bucket}): stored $${oldValue.toFixed(2)} force-aligned to ledger-implied $${ledgerImpliedValue.toFixed(2)} by admin. Reason: ${reason}`,
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'RESYNC_BALANCE',
          targetType: 'SELLER_BALANCE',
          targetId: sellerId,
          details: { bucket, oldValue, newValue: ledgerImpliedValue, reason, ledgerEntryId: entry.id },
        },
      });

      return entry;
    });
  }
}
