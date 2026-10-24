// Asia/Dili is UTC+9 year-round (no DST), so a fixed offset is enough —
// no need for a timezone-database dependency just to compute a calendar
// month boundary.
const DILI_OFFSET_MS = 9 * 60 * 60 * 1000;

// "YYYY-MM" for the given instant, as a calendar date in Asia/Dili rather
// than UTC — used by ReferralsService/ReferralPayoutJob so a payout
// right around midnight lands in the month the referrer actually expects.
export function diliMonthKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + DILI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
