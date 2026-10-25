import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SmsProvider, SmsProviderKind } from './sms-provider.interface';

// Twilio's numeric error codes, mapped to short, friendly Tetum messages
// — https://www.twilio.com/docs/api/errors. Anything not listed here
// falls back to a generic message; the real code/message/request SID are
// always logged server-side regardless (never the OTP code or auth
// token — see sendSms below).
const TWILIO_ERROR_MESSAGES: Record<number, string> = {
  21211: 'Numeru telefone invalidu.',
  21408: 'Numeru ida-ne’e la bele simu SMS husi ami-nia servisu.',
  21610: 'Numeru ida-ne’e hapara simu SMS husi ami-nia servisu.',
  20429: 'Servisu okupadu, koko fali daudauk.',
  21611: 'Servisu okupadu, koko fali daudauk.',
};
const GENERIC_TWILIO_ERROR_MESSAGE = 'La konsege haruka SMS agora — koko fali tarde.';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly kind: SmsProviderKind = 'twilio';
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: Twilio | null = null;
  private messagingServiceSid: string | undefined;
  private fromNumber: string | undefined;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    // API Key auth (SID starts with "SK", paired with its own secret) is
    // Twilio's recommended method — individually revocable without
    // rotating the account's master Auth Token. Preferred over
    // TWILIO_AUTH_TOKEN whenever both are present.
    const apiKeySid = this.configService.get<string>('TWILIO_API_KEY_SID');
    const apiKeySecret = this.configService.get<string>('TWILIO_API_KEY_SECRET');
    this.messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    const hasApiKeyAuth = !!apiKeySid && !!apiKeySecret;
    const hasAuthTokenAuth = !!authToken;

    const missing: string[] = [];
    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!hasApiKeyAuth && !hasAuthTokenAuth) {
      missing.push('TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN)');
    }
    if (!this.messagingServiceSid && !this.fromNumber) {
      missing.push('TWILIO_MESSAGING_SERVICE_SID (or TWILIO_FROM_NUMBER)');
    }

    if (missing.length > 0) {
      // Deliberately NOT a throw — see this class's doc precedent in
      // ConsoleSmsProvider for the one place a provider SHOULD crash
      // (that one guards against ever running in production at all).
      // Here, a misconfigured Twilio binding must leave the rest of the
      // app running; isAvailable() being false is what
      // ReferralsService's enable-the-flag gate actually checks.
      this.logger.error(
        `TwilioSmsProvider is missing required configuration: ${missing.join(', ')}. SMS sending is disabled until this is fixed.`,
      );
      return;
    }

    this.client = hasApiKeyAuth
      ? new Twilio(apiKeySid, apiKeySecret, { accountSid })
      : new Twilio(accountSid, authToken);
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async sendSms(toE164: string, message: string): Promise<void> {
    if (!this.client) {
      throw new Error('TwilioSmsProvider is not available — missing configuration (see startup logs).');
    }
    // Defense-in-depth — independent of whatever normalization the
    // caller already did, this provider refuses to send outside Timor-Leste.
    if (!toE164.startsWith('+670')) {
      throw new Error('TwilioSmsProvider only sends to +670 (Timor-Leste) numbers.');
    }

    try {
      await this.client.messages.create({
        to: toE164,
        body: message,
        ...(this.messagingServiceSid
          ? { messagingServiceSid: this.messagingServiceSid }
          : { from: this.fromNumber }),
      });
    } catch (error: any) {
      const code = typeof error?.code === 'number' ? error.code : undefined;
      // Real diagnostic detail goes to the log — request SID/status/code,
      // never the message body (which contains the OTP) and never any
      // credential.
      this.logger.error(
        `Twilio send failed (code=${code ?? 'unknown'}, status=${error?.status ?? 'unknown'}): ${error?.message ?? error}`,
      );
      const friendly = code !== undefined ? TWILIO_ERROR_MESSAGES[code] : undefined;
      throw new Error(friendly ?? GENERIC_TWILIO_ERROR_MESSAGE);
    }
  }
}
