// Shared between OrdersService.updateShippingStatus (what it tells the
// customer) and DeliveryAutoConfirmJob (what it actually enforces) — kept
// as one constant so the message never drifts from the real grace period.
export const DELIVERY_AUTO_CONFIRM_GRACE_DAYS = 3;
