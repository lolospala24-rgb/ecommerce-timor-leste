import { ShippingStatus } from '@prisma/client';

// Shared between OrdersService.updateShippingStatus (what it tells the
// customer) and DeliveryAutoConfirmJob (what it actually enforces) — kept
// as one constant so the message never drifts from the real grace period.
export const DELIVERY_AUTO_CONFIRM_GRACE_DAYS = 3;

// The delivery-stage equivalent of OrdersService.updateStatus's
// validTransitions map for OrderStatus — same idea, same enforcement (every
// caller, no role bypass), just for the courier-facing field instead of the
// financial one. FAILED -> BOOKED is the retry path: assignDriver resets a
// FAILED order back to BOOKED when it hands the delivery to a new driver,
// so this transition exists to let that reset actually happen.
export const SHIPPING_STATUS_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  [ShippingStatus.PENDING]: [ShippingStatus.BOOKED, ShippingStatus.FAILED],
  [ShippingStatus.BOOKED]: [ShippingStatus.IN_TRANSIT, ShippingStatus.FAILED],
  [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
  [ShippingStatus.DELIVERED]: [],
  [ShippingStatus.FAILED]: [ShippingStatus.BOOKED],
};
