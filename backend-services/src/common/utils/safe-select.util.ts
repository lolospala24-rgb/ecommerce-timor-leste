/**
 * Fields safe to expose when a `User` is nested inside another entity's
 * API response (e.g. an order's customer, a seller's linked user account).
 * Deliberately excludes password, refreshToken, resetToken, and every other
 * credential/token column — those must never leave the server via `include`.
 */
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} as const;

/**
 * Fields safe to expose when a `Seller` is nested inside an order/payment
 * response seen by a customer (or another seller). Deliberately excludes
 * bankName/bankAccountName/bankAccountNumber (payout destination — only
 * the seller themselves or an admin should ever see those) and the
 * verification/rejection audit trail. Nests `user` through
 * `SAFE_USER_SELECT` rather than the bare `User` relation.
 */
export const SAFE_SELLER_SELECT = {
  id: true,
  userId: true,
  storeName: true,
  storePhone: true,
  storeEmail: true,
  storeAddress: true,
  storeLogo: true,
  storeBanner: true,
  description: true,
  user: { select: SAFE_USER_SELECT },
} as const;
