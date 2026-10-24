// Deliberately provider-agnostic — a real carrier (Telkomcel, Telemor,
// Timor Telecom, Twilio, etc.) gets wired in later purely by changing the
// SMS_PROVIDER DI binding in PhoneVerificationModule; no call site here
// ever needs to know which one is active.
export interface SmsProvider {
  sendSms(toE164: string, message: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
