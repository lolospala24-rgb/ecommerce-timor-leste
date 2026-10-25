import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsProviderKind } from './sms-provider.interface';

// Dev/test stand-in — logs the message instead of sending a real SMS, so
// local development and CI never need real carrier credentials. The
// phone/SMS verification path is currently dormant (ReferralsService's
// active gate runs on email OTP instead, see EmailOtpService), but
// PhoneVerificationModule stays registered for a possible future
// reactivation — which means this provider is still constructed at
// boot in every environment, including production, whenever
// SMS_PROVIDER isn't set to 'twilio'. Safety guard therefore lives on
// sendSms() itself, not the constructor: merely being instantiated
// must never crash the whole app, but it must never silently "send" a
// real OTP nowhere in production either — if something actually tries
// to use it there, that's a real bug and must fail loudly. kind:
// 'console' is what lets a future re-enabled phone-verification gate
// reject this provider even though isAvailable() is true — "can run"
// and "is a real carrier" are different questions.
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly kind: SmsProviderKind = 'console';
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async sendSms(toE164: string, message: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ConsoleSmsProvider must never actually send in production — configure a real SMS_PROVIDER binding before relying on phone-based verification.',
      );
    }
    this.logger.log(`[DEV SMS] to ${toE164}: ${message}`);
  }
}
