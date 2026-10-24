// Deliberately provider-agnostic — which carrier is active is purely a
// SMS_PROVIDER DI binding in SmsModule, never something a call site needs
// to know. `kind`/`isAvailable()` exist so code OUTSIDE this abstraction
// (specifically ReferralsService's "don't let an admin enable phone
// verification without a real, working provider" gate) can tell "a real
// provider that's actually configured" apart from "the dev mock is
// running" without reaching for `instanceof` against a concrete class.
export type SmsProviderKind = 'console' | 'twilio';

export interface SmsProvider {
  readonly kind: SmsProviderKind;
  // False means sendSms() would just fail — e.g. Twilio credentials are
  // missing/incomplete. Checked proactively (ReferralsService's gate) so
  // a misconfiguration surfaces as a clear rejected settings change, not
  // as every OTP silently failing to send after the flag is already on.
  isAvailable(): boolean;
  sendSms(toE164: string, message: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
