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

// "YYYY-MM-DD" for the given instant, as a calendar date in Asia/Dili —
// used for the SMS global daily cap and usage-summary counters, so a
// request right around midnight lands in the day a Dili-based admin
// actually expects.
export function diliDayKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + DILI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Start-of-Dili-day boundary, expressed as a real UTC Date — used to
// query SmsLog rows by `createdAt >=` for the admin usage summary
// (diliDayKey alone is fine for a Redis key, but a DB range query needs
// an actual instant, not a string).
export function startOfDiliDay(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + DILI_OFFSET_MS);
  const dayStartShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(dayStartShifted - DILI_OFFSET_MS);
}

// Start-of-Dili-month boundary, same reasoning as startOfDiliDay.
export function startOfDiliMonth(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + DILI_OFFSET_MS);
  const monthStartShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
  return new Date(monthStartShifted - DILI_OFFSET_MS);
}
