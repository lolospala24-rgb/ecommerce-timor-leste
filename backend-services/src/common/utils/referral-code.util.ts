import { randomInt } from 'crypto';

// Excludes 0/O and 1/I/L — unambiguous whether read aloud, typed by hand,
// or read off a screenshot (the two things this code is actually used for:
// sharing verbally and pasting into a URL).
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReferralCodeCandidate(): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_CHARSET[randomInt(REFERRAL_CODE_CHARSET.length)];
  }
  return code;
}

// Mirrors slug.util.ts's generateUniqueSlug checked-loop shape, but
// regenerates a fully fresh random candidate on each retry instead of
// appending -2, -3... — there's no human-readable base here to append to.
export async function generateUniqueReferralCode(
  isTaken: (code: string) => Promise<boolean>,
): Promise<string> {
  let candidate = generateReferralCodeCandidate();
  while (await isTaken(candidate)) {
    candidate = generateReferralCodeCandidate();
  }
  return candidate;
}
