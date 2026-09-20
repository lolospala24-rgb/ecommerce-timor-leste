// GA4 Ecommerce event helpers — thin wrappers around window.gtag() matching
// Google's recommended ecommerce event names/params
// (https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).
// No-op whenever GA hasn't loaded (measurement ID unset, script still
// loading, or gtag blocked by an ad blocker) — callers never need to guard.

export interface AnalyticsItem {
  item_id: number | string;
  item_name: string;
  price?: number;
  quantity?: number;
}

function sendGAEvent(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackViewItem(item: AnalyticsItem): void {
  sendGAEvent('view_item', {
    currency: 'USD',
    value: item.price ?? 0,
    items: [{ ...item, quantity: item.quantity ?? 1 }],
  });
}

export function trackAddToCart(item: AnalyticsItem): void {
  const quantity = item.quantity ?? 1;
  sendGAEvent('add_to_cart', {
    currency: 'USD',
    value: (item.price ?? 0) * quantity,
    items: [{ ...item, quantity }],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number): void {
  sendGAEvent('begin_checkout', { currency: 'USD', value, items });
}

export function trackPurchase(
  transactionId: string | number,
  items: AnalyticsItem[],
  value: number,
  shipping?: number,
  tax?: number,
): void {
  sendGAEvent('purchase', {
    transaction_id: String(transactionId),
    currency: 'USD',
    value,
    shipping,
    tax,
    items,
  });
}

// Referral program — not part of GA4's standard ecommerce event set, so
// these are custom events (still routed through the same gtag() call).
// `method` matches the channel button actually used, so the funnel can be
// broken down by channel (WhatsApp vs Facebook vs copy-link, etc).
export function trackShareReferral(method: string): void {
  sendGAEvent('share_referral', { method });
}

// Fired client-side on the referred user's own successful registration —
// there's no server-side GA4 wiring in this app, so this is the only point
// that can attribute a signup to a referral at all.
export function trackReferralSignup(): void {
  sendGAEvent('referral_signup', {});
}

// Fired from the referrer's own dashboard once it notices a newly-REWARDED
// referral (see useReferralRewardTracking) — reward-granting itself happens
// server-side on delivery, often while the referrer isn't even online, so
// "the referrer's browser learning about it" is the earliest client-side
// moment this can be reported.
export function trackReferralRewardEarned(amount: number, referralId: number): void {
  sendGAEvent('referral_reward_earned', {
    currency: 'USD',
    value: amount,
    referral_id: referralId,
  });
}
