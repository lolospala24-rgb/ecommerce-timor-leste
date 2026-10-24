import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsProviderKind } from './sms-provider.interface';

// Dev/test stand-in — logs the message instead of sending a real SMS, so
// local development and CI never need real carrier credentials. Hard
// safety guard: refuses to run at all under NODE_ENV=production, so a
// misconfigured deploy can never silently "send" OTP codes nowhere while
// looking like it succeeded. kind: 'console' is what lets
// ReferralsService's enable-the-flag gate reject this provider even
// though isAvailable() is true — "can run" and "is a real carrier" are
// different questions.
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly kind: SmsProviderKind = 'console';
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ConsoleSmsProvider must never be used in production — configure a real SMS_PROVIDER binding before deploying with referralRequirePhoneVerification available.',
      );
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async sendSms(toE164: string, message: string): Promise<void> {
    this.logger.log(`[DEV SMS] to ${toE164}: ${message}`);
  }
}
