import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioSmsProvider } from './twilio-sms.provider';

// The Twilio SDK is mocked at the module level — this test suite must
// NEVER make a real network call to Twilio. `mockCreate` is the single
// shared stand-in for `client.messages.create`.
const mockCreate = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

const FULL_CONFIG = {
  TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  TWILIO_AUTH_TOKEN: 'super-secret-auth-token-must-never-be-logged',
  TWILIO_MESSAGING_SERVICE_SID: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};

describe('TwilioSmsProvider', () => {
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCreate.mockReset();
    logErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logErrorSpy.mockRestore();
  });

  describe('availability / env validation', () => {
    it('is unavailable (not crashed) and logs a clear error when all credentials are missing', () => {
      const provider = new TwilioSmsProvider(makeConfig({}));

      expect(provider.isAvailable()).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledWith(expect.stringContaining('missing required configuration'));
    });

    it('is unavailable when neither a Messaging Service nor a from-number is configured', () => {
      const provider = new TwilioSmsProvider(
        makeConfig({
          TWILIO_ACCOUNT_SID: FULL_CONFIG.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: FULL_CONFIG.TWILIO_AUTH_TOKEN,
        }),
      );

      expect(provider.isAvailable()).toBe(false);
    });

    it('is available once fully configured via TWILIO_MESSAGING_SERVICE_SID', () => {
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));
      expect(provider.isAvailable()).toBe(true);
    });

    it('is available when configured via TWILIO_FROM_NUMBER instead of a Messaging Service', () => {
      const provider = new TwilioSmsProvider(
        makeConfig({
          TWILIO_ACCOUNT_SID: FULL_CONFIG.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: FULL_CONFIG.TWILIO_AUTH_TOKEN,
          TWILIO_FROM_NUMBER: '+15551234567',
        }),
      );
      expect(provider.isAvailable()).toBe(true);
    });

    it('never logs the auth token on startup, even when configuration is complete', () => {
      new TwilioSmsProvider(makeConfig(FULL_CONFIG));
      const loggedText = logErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedText).not.toContain(FULL_CONFIG.TWILIO_AUTH_TOKEN);
    });
  });

  describe('sendSms', () => {
    it('throws without ever calling Twilio when the provider is unavailable', async () => {
      const provider = new TwilioSmsProvider(makeConfig({}));

      await expect(provider.sendSms('+67077123456', 'code 123456')).rejects.toThrow('not available');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('sends successfully to a +670 number via the Messaging Service', async () => {
      mockCreate.mockResolvedValue({ sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', status: 'queued' });
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));

      await provider.sendSms('+67077123456', 'LOLOSPALA: Ita-nia kodigu verifikasaun mak 123456.');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+67077123456',
          body: 'LOLOSPALA: Ita-nia kodigu verifikasaun mak 123456.',
          messagingServiceSid: FULL_CONFIG.TWILIO_MESSAGING_SERVICE_SID,
        }),
      );
    });

    it('sends via the from-number when no Messaging Service is configured', async () => {
      mockCreate.mockResolvedValue({ sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' });
      const provider = new TwilioSmsProvider(
        makeConfig({
          TWILIO_ACCOUNT_SID: FULL_CONFIG.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: FULL_CONFIG.TWILIO_AUTH_TOKEN,
          TWILIO_FROM_NUMBER: '+15551234567',
        }),
      );

      await provider.sendSms('+67077123456', 'code 123456');

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ from: '+15551234567' }));
    });

    it('rejects a non-+670 destination in code, before ever calling Twilio', async () => {
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));

      await expect(provider.sendSms('+15551234567', 'code 123456')).rejects.toThrow('+670');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it.each([
      [21211, 'Numeru telefone invalidu.'],
      [21408, 'la bele simu SMS'],
      [21610, 'hapara simu SMS'],
      [20429, 'Servisu okupadu'],
      [21611, 'Servisu okupadu'],
    ])('maps Twilio error code %s to a friendly Tetum message', async (code, expectedSubstring) => {
      mockCreate.mockRejectedValue(Object.assign(new Error('Twilio rejected the request'), { code, status: 400 }));
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));

      await expect(provider.sendSms('+67077123456', 'code 123456')).rejects.toThrow(expectedSubstring as string);
    });

    it('falls back to a generic Tetum message for an unmapped Twilio error code', async () => {
      mockCreate.mockRejectedValue(Object.assign(new Error('Twilio rejected the request'), { code: 99999, status: 500 }));
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));

      await expect(provider.sendSms('+67077123456', 'code 123456')).rejects.toThrow('La konsege haruka SMS agora');
    });

    it('never logs the OTP code or the auth token when a send fails', async () => {
      const secretCode = '582913';
      mockCreate.mockRejectedValue(Object.assign(new Error('Twilio rejected the request'), { code: 21211, status: 400 }));
      const provider = new TwilioSmsProvider(makeConfig(FULL_CONFIG));

      await expect(
        provider.sendSms('+67077123456', `LOLOSPALA: Ita-nia kodigu verifikasaun mak ${secretCode}.`),
      ).rejects.toThrow();

      const loggedText = logErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedText).not.toContain(secretCode);
      expect(loggedText).not.toContain(FULL_CONFIG.TWILIO_AUTH_TOKEN);
    });
  });
});
