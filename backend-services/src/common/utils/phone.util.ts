const TIMOR_COUNTRY_CODE = '+670';

export type PhoneNormalizationResult =
  | { ok: true; phone: string }
  | { ok: false; reason: 'TOO_SHORT' | 'INVALID' };

// Timor-Leste mobile numbers are exactly 8 digits starting with 7 (e.g.
// 77xxxxxx, 78xxxxxx). Accepts already-E.164 input (+670...), a bare
// "670..." prefix, a local leading-0 trunk prefix, or a bare local
// number — normalizes all of them to the same canonical +670XXXXXXXX
// form. A 7-digit local number gets its own TOO_SHORT reason (distinct
// from a generically malformed INVALID one) so callers can surface a
// specific "numeru seluler tenke 8 dígitu" message instead of a vague
// "invalid phone number" for what's very likely just a typo.
export function normalizeToTimorE164(raw: string): PhoneNormalizationResult {
  if (!raw) return { ok: false, reason: 'INVALID' };
  const digitsAndPlus = raw.trim().replace(/[^\d+]/g, '');
  if (!digitsAndPlus) return { ok: false, reason: 'INVALID' };

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

  const national = candidate.startsWith('+670') ? candidate.slice(4) : null;
  if (national === null || !/^\d+$/.test(national)) {
    return { ok: false, reason: 'INVALID' };
  }
  if (/^7\d{6}$/.test(national)) {
    return { ok: false, reason: 'TOO_SHORT' };
  }
  if (/^7\d{7}$/.test(national)) {
    return { ok: true, phone: `+670${national}` };
  }
  return { ok: false, reason: 'INVALID' };
}
