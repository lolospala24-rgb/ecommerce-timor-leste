import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let prisma: any;
  let redisService: any;
  let smsProvider: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      phoneVerificationCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    smsProvider = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhoneVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: SMS_PROVIDER, useValue: smsProvider },
      ],
    }).compile();

    service = module.get(PhoneVerificationService);
  });

  describe('requestCode', () => {
    it('rejects an invalid phone number without ever touching the DB or sending anything', async () => {
      await expect(service.requestCode(1, 'not-a-phone')).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
      expect(prisma.phoneVerificationCode.create).not.toHaveBeenCalled();
    });

    it('normalizes a local 8-digit number, sends via the injected SmsProvider, and stores only a hash (never the plaintext code)', async () => {
      await service.requestCode(1, '77123456');

      expect(smsProvider.sendSms).toHaveBeenCalledWith('+67077123456', expect.stringContaining('verification code'));
      expect(prisma.phoneVerificationCode.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 1, phone: '+67077123456' }) }),
      );
      const createCall = prisma.phoneVerificationCode.create.mock.calls[0][0];
      const storedHash: string = createCall.data.codeHash;
      // The mocked hash format is "hashed:<code>" — assert the stored
      // value is never a bare 6-digit string (i.e. never the plaintext).
      expect(storedHash).toMatch(/^hashed:\d{6}$/);
      expect(storedHash).not.toMatch(/^\d{6}$/);
    });

    it('rejects when the number is already verified on a different account, with the same generic message as a rate limit', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2 }); // owned by someone else (caller is user 1)

      await expect(service.requestCode(1, '77123456')).rejects.toThrow(
        "This phone number can't be verified right now. Please try again later or use a different number.",
      );
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('allows re-requesting for a number the SAME user already verified (no self-block)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 }); // owned by the caller themselves

      await service.requestCode(1, '77123456');

      expect(smsProvider.sendSms).toHaveBeenCalled();
    });

    it('enforces the 60-second send cooldown per phone', async () => {
      redisService.get.mockImplementation((key: string) =>
        Promise.resolve(key.startsWith('phone_otp_cooldown:') ? '1' : null),
      );

      await expect(service.requestCode(1, '77123456')).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('enforces the 5-per-day send cap per phone', async () => {
      redisService.get.mockImplementation((key: string) =>
        Promise.resolve(key.startsWith('phone_otp_daily:') ? '5' : null),
      );

      await expect(service.requestCode(1, '77123456')).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });

    it('enforces the 5-per-day send cap per user, even across different phone numbers', async () => {
      redisService.get.mockImplementation((key: string) =>
        Promise.resolve(key.startsWith('phone_otp_daily_user:') ? '5' : null),
      );

      await expect(service.requestCode(1, '77123456')).rejects.toThrow(BadRequestException);
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
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
});
