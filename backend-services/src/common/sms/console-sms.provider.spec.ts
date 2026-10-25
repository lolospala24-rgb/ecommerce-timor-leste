import { ConsoleSmsProvider } from './console-sms.provider';

describe('ConsoleSmsProvider', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('can be constructed under NODE_ENV=production without throwing', () => {
    process.env.NODE_ENV = 'production';

    // Regression test: PhoneVerificationModule stays registered even
    // though its gate is dormant, so Nest's DI eagerly constructs this
    // provider at boot in every environment whenever SMS_PROVIDER isn't
    // 'twilio'. Throwing here previously crash-looped the entire app in
    // production — the guard belongs on sendSms() instead.
    expect(() => new ConsoleSmsProvider()).not.toThrow();
  });

  it('isAvailable() is true under NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    const provider = new ConsoleSmsProvider();

    expect(provider.isAvailable()).toBe(true);
  });

  it('rejects an actual send under NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    const provider = new ConsoleSmsProvider();

    await expect(provider.sendSms('+67077123456', 'code 123456')).rejects.toThrow(
      'must never actually send in production',
    );
  });

  it('logs instead of sending outside production', async () => {
    process.env.NODE_ENV = 'test';
    const provider = new ConsoleSmsProvider();

    await expect(provider.sendSms('+67077123456', 'code 123456')).resolves.toBeUndefined();
  });
});
