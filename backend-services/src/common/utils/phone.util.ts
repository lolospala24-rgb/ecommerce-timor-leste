const TIMOR_COUNTRY_CODE = '+670';

// Timor-Leste mobile numbers are 7-8 digits starting with 7 (e.g. 77xxxxxx,
// 78xxxxxx). Accepts already-E.164 input (+670...), a bare "670..." prefix,
// a local leading-0 trunk prefix, or a bare local number — normalizes all
// of them to the same canonical +670XXXXXXXX form, or returns null for
// anything that doesn't resolve to a plausible Timor-Leste mobile number.
export function normalizeToTimorE164(raw: string): string | null {
  if (!raw) return null;
  const digitsAndPlus = raw.trim().replace(/[^\d+]/g, '');
  if (!digitsAndPlus) return null;

  let candidate: string;
  if (digitsAndPlus.startsWith('+670')) {
    candidate = digitsAndPlus;
  } else if (digitsAndPlus.startsWith('670')) {
    candidate = `+${digitsAndPlus}`;
  } else if (digitsAndPlus.startsWith('0')) {
    candidate = `${TIMOR_COUNTRY_CODE}${digitsAndPlus.slice(1)}`;
  } else {
    candidate = `${TIMOR_COUNTRY_CODE}${digitsAndPlus}`;
  }

  const match = candidate.match(/^\+670(7\d{6,7})$/);
  return match ? `+670${match[1]}` : null;
}
