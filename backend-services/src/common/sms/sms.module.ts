import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SMS_PROVIDER } from './sms-provider.interface';
import { ConsoleSmsProvider } from './console-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';

// Shared by PhoneVerificationModule (sending OTPs) and ReferralsModule
// (the "don't let an admin enable phone verification without a real
// provider" gate) — extracted into its own module so neither of those
// two feature modules needs to depend on the other just to share this
// one binding.
//
// SMS_PROVIDER=twilio selects TwilioSmsProvider; anything else (including
// unset, which is the default everywhere except a deploy that explicitly
// opts in) selects ConsoleSmsProvider. No provider is chosen by default
// in production-like configuration beyond this env switch — deliberately
// explicit, not inferred from NODE_ENV.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SMS_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const providerName = configService.get<string>('SMS_PROVIDER');
        if (providerName === 'twilio') {
          return new TwilioSmsProvider(configService);
        }
        return new ConsoleSmsProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
