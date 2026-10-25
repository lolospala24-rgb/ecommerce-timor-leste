import type { ReferralStatus } from '@/hooks/useReferral';
import type { StatusPillTone } from '@/components/account/StatusPill';

// Shared between the referrals list and detail pages — QUALIFIED/CAPPED
// both just mean "the referrer hasn't been paid yet" from a shopper's
// point of view (the difference between them is purely an internal
// monthly-cap bookkeeping detail), so both read as "Hein hela" alongside
// plain PENDING (friend hasn't ordered yet at all).
export function getReferralStatusDisplay(status: ReferralStatus): { label: string; tone: StatusPillTone } {
  switch (status) {
    case 'REWARDED':
      return { label: 'Prémiu simu', tone: 'success' };
    case 'REVERSED':
      return { label: 'Kansela', tone: 'danger' };
    case 'PENDING':
    case 'QUALIFIED':
    case 'CAPPED':
    default:
      return { label: 'Hein hela', tone: 'muted' };
  }
}
