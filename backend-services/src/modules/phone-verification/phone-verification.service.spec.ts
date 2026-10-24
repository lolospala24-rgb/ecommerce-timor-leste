import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PhoneVerificationService } from './phone-verification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SMS_PROVIDER } from '../../common/sms/sms-provider.interface';

// hashPassword/comparePassword are reused as-is from the existing bcrypt
// util (no new hashing primitive) — mocked here with a simple, readable
// stand-in so tests never need to know a real bcrypt hash shape, and so
// the "never stored in plaintext" test has something concrete to assert
// against (a real code value would never appear as a substring of the
// stored hash under this stand-in either, same guarantee bcrypt gives).
jest.mock('../../common/utils/bcrypt.util', () => ({
  hashPassword: jest.fn(async (plain: string) => `hashed:${plain}`),
  comparePassword: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

const CLIENT_IP = '203.0.113.7';

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let prisma: any;
  let redisService: any;
  let configService: any;
  let smsProvider: any;
  let counters: Record<string, number>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      phoneVerificationCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      smsLog: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      adminLog: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    // Atomic fixed-window counter, modeled on RedisService.incrWithWindow's
    // real Lua-script semantics (INCR then EXPIRE-on-first) — a plain
    // synchronous increment per key is enough to prove "many parallel
    // callers never see more successes than the cap allows", since the
    // whole point under test is the service's own count-then-gate logic,
    // not Redis's internals.
    counters = {};
    redisService = {
      incrWithWindow: jest.fn(async (key: string) => {
        counters[key] = (counters[key] ?? 0) + 1;
        return counters[key];
      }),
    };

    configService = { get: jest.fn().mockReturnValue(undefined) };
    smsProvider = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhoneVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
        { provide: SMS_PROVIDER, useValue: smsProvider },
      ],
    }).compile();

    service = module.get(PhoneVerificationService);
  });

  describe('requestCode', () => {
    it('rejects an invalid phone number without ever touching the DB or sending anything', async () => {
      await expect(service.requestCode(1, 'not-a-phone', CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
      expect(prisma.phoneVerificationCode.create).not.toHaveBeenCalled();
    });

    it('rejects a 7-digit number with a distinct "must be 8 digits" message', async () => {
      await expect(service.requestCode(1, '7712345', CLIENT_IP)).rejects.toThrow('tenke 8 dígitu');
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it.each([['77123456'], ['+670 771 234 56'], ['670-77123456'], ['0 77123456']])(
      'accepts the 8-digit-starting-with-7 shape %s and normalizes to +67077123456',
      async (raw) => {
        await service.requestCode(1, raw, CLIENT_IP);
        expect(smsProvider.sendSms).toHaveBeenCalledWith('+67077123456', expect.stringContaining('verifikasaun'));
      },
    );

    it.each([['81234567'], ['771234567'], ['123456']])(
      'rejects numbers that are not 8 digits starting with 7: %s',
      async (raw) => {
        await expect(service.requestCode(1, raw, CLIENT_IP)).rejects.toThrow(BadRequestException);
        expect(smsProvider.sendSms).not.toHaveBeenCalled();
      },
    );

    it('stores only a hash of the code (never the plaintext)', async () => {
      await service.requestCode(1, '77123456', CLIENT_IP);

      expect(prisma.phoneVerificationCode.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 1, phone: '+67077123456' }) }),
      );
      const createCall = prisma.phoneVerificationCode.create.mock.calls[0][0];
      const storedHash: string = createCall.data.codeHash;
      expect(storedHash).toMatch(/^hashed:\d{6}$/);
      expect(storedHash).not.toMatch(/^\d{6}$/);
    });

    it('records a SENT SmsLog row on success, with a masked phone number', async () => {
      await service.requestCode(1, '77123456', CLIENT_IP);

      expect(prisma.smsLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 1, status: 'SENT' }) }),
      );
      const logCall = prisma.smsLog.create.mock.calls[0][0];
      expect(logCall.data.phoneMasked).not.toBe('+67077123456');
      expect(logCall.data.phoneMasked).not.toContain('123456');
    });

    it('records a FAILED SmsLog row and surfaces the provider error when sending fails', async () => {
      smsProvider.sendSms.mockRejectedValue(new Error('La konsege haruka SMS agora — koko fali tarde.'));

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(
        'La konsege haruka SMS agora — koko fali tarde.',
      );
      expect(prisma.smsLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
      );
    });

    it('rejects when the number is already verified on a different account, with the same generic message as a rate limit', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2 }); // owned by someone else (caller is user 1)

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(
        "This phone number can't be verified right now. Please try again later or use a different number.",
      );
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('allows re-requesting for a number the SAME user already verified (no self-block)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 }); // owned by the caller themselves

      await service.requestCode(1, '77123456', CLIENT_IP);

      expect(smsProvider.sendSms).toHaveBeenCalled();
    });

    it('enforces the 60-second send cooldown per phone', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('phone_otp_cooldown:') ? 2 : 1,
      );

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('enforces the 5-per-day send cap per phone', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('phone_otp_daily:') ? 6 : 1,
      );

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('enforces the 5-per-day send cap per user, even across different phone numbers', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('phone_otp_daily_user:') ? 6 : 1,
      );

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('enforces the 10-per-day send cap per IP, even across different users/phones', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('phone_otp_daily_ip:') ? 11 : 1,
      );

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('rejects with the Tetum "okupadu" message once the global daily cap is reached', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('sms_global_daily:') ? 201 : 1,
      );

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(
        'Servisu verifikasaun okupadu, koko fali aban.',
      );
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('respects a configured SMS_DAILY_GLOBAL_CAP override', async () => {
      configService.get.mockImplementation((key: string) => (key === 'SMS_DAILY_GLOBAL_CAP' ? 2 : undefined));
      redisService.incrWithWindow.mockImplementation(async (key: string) => (key.startsWith('sms_global_daily:') ? 3 : 1));

      await expect(service.requestCode(1, '77123456', CLIENT_IP)).rejects.toThrow(
        'Servisu verifikasaun okupadu, koko fali aban.',
      );
    });

    it('never lets more sends through than the per-user daily cap, even when many requests race in parallel', async () => {
      const phones = ['77100001', '77100002', '77100003', '77100004', '77100005', '77100006', '77100007'];

      const results = await Promise.allSettled(phones.map((phone) => service.requestCode(1, phone, CLIENT_IP)));

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;
      expect(succeeded).toBe(5); // MAX_SENDS_PER_USER_PER_DAY
      expect(rejected).toBe(2);
      expect(smsProvider.sendSms).toHaveBeenCalledTimes(5);
    });
  });

  describe('verifyCode', () => {
    const pendingCode = {
      id: 10,
      userId: 1,
      phone: '+67077123456',
      codeHash: 'hashed:123456',
      expiresAt: new Date(Date.now() + 5 * 60_000),
      attempts: 0,
      consumedAt: null,
    };

    it('verifies on the correct code and sets User.verifiedPhone/phoneVerifiedAt', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({ ...pendingCode });
      prisma.user = { ...prisma.user, update: jest.fn() };

      await service.verifyCode(1, '123456');

      expect(prisma.phoneVerificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 }, data: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ verifiedPhone: '+67077123456', phoneVerifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('rejects an incorrect code and increments the attempt counter', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({ ...pendingCode });

      await expect(service.verifyCode(1, '000000')).rejects.toThrow(BadRequestException);

      expect(prisma.phoneVerificationCode.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { attempts: { increment: 1 } },
      });
    });

    it('locks out after 5 incorrect attempts, even with the right code', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({ ...pendingCode, attempts: 5 });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('Too many incorrect attempts');
    });

    it('rejects an expired code', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({
        ...pendingCode,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('expired');
    });

    it('rejects when there is no pending code at all', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('No verification code is pending');
    });

    it('converts a race-lost unique-constraint violation into a clean error instead of a 500', async () => {
      prisma.phoneVerificationCode.findFirst.mockResolvedValue({ ...pendingCode });
      prisma.$transaction = jest.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('just verified on another account');
    });
  });

  describe('adminUnlinkPhone', () => {
    it('rejects when the target account has no verified phone', async () => {
      prisma.user.findUnique.mockResolvedValue({ verifiedPhone: null });

      await expect(service.adminUnlinkPhone(5, 42)).rejects.toThrow('no verified phone number to unlink');
      expect(prisma.adminLog.create).not.toHaveBeenCalled();
    });

    it('clears the verified phone and writes an audit log naming the admin and the unlinked number', async () => {
      prisma.user.findUnique.mockResolvedValue({ verifiedPhone: '+67077123456' });
      prisma.user.update = jest.fn();

      await service.adminUnlinkPhone(5, 42);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { verifiedPhone: null, phoneVerifiedAt: null },
      });
      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: 42,
            action: 'UNLINK_VERIFIED_PHONE',
            targetType: 'USER',
            targetId: 5,
            details: { unlinkedPhone: '+67077123456' },
          }),
        }),
      );
    });
  });

  describe('getSmsUsageSummary', () => {
    it('counts only SENT logs for today and this month', async () => {
      prisma.smsLog.count.mockResolvedValueOnce(3).mockResolvedValueOnce(40);

      const result = await service.getSmsUsageSummary();

      expect(result).toEqual({ today: 3, thisMonth: 40 });
      expect(prisma.smsLog.count).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ status: 'SENT' }) }));
      expect(prisma.smsLog.count).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ status: 'SENT' }) }));
    });
  });
});
