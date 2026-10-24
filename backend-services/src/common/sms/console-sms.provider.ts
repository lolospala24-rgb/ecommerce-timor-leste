import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

// Dev/test stand-in — logs the message instead of sending a real SMS, so
// local development and CI never need real carrier credentials. Hard
// safety guard: refuses to run at all under NODE_ENV=production, so a
// misconfigured deploy can never silently "send" OTP codes nowhere while
// looking like it succeeded. A real provider (Telkomcel/Telemor/Timor
// Telecom/Twilio/etc.) gets wired in later purely via the SMS_PROVIDER
// binding in PhoneVerificationModule — nothing else needs to change.
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ConsoleSmsProvider must never be used in production — configure a real SMS_PROVIDER binding before deploying with referralRequirePhoneVerification available.',
      );
    }
  }

  async sendSms(toE164: string, message: string): Promise<void> {
    this.logger.log(`[DEV SMS] to ${toE164}: ${message}`);
  }
}
