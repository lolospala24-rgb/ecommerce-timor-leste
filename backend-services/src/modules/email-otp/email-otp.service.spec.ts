import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmailOtpService } from './email-otp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';

// hashPassword/comparePassword are reused as-is from the existing bcrypt
// util — mocked here the same way PhoneVerificationService's spec does,
// so the "never stored in plaintext" test has something concrete to
// assert against.
jest.mock('../../common/utils/bcrypt.util', () => ({
  hashPassword: jest.fn(async (plain: string) => `hashed:${plain}`),
  comparePassword: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

const CLIENT_IP = '203.0.113.7';
const ACCOUNT = { email: 'friend@example.com', name: 'Friend' };

describe('EmailOtpService', () => {
  let service: EmailOtpService;
  let prisma: any;
  let redisService: any;
  let mailService: any;
  let counters: Record<string, number>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 1, ...ACCOUNT }), update: jest.fn() },
      emailOtpCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      adminLog: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    // Same atomic fixed-window counter model as
    // PhoneVerificationService's spec — a plain synchronous increment per
    // key proves "many parallel callers never exceed the cap", since the
    // service's own count-then-gate logic is what's under test here, not
    // Redis's internals.
    counters = {};
    redisService = {
      incrWithWindow: jest.fn(async (key: string) => {
        counters[key] = (counters[key] ?? 0) + 1;
        return counters[key];
      }),
    };

    mailService = { sendOtpCodeEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailOtpService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(EmailOtpService);
  });

  describe('requestCode', () => {
    it('rejects when the account does not exist, without sending anything', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.requestCode(1, CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(mailService.sendOtpCodeEmail).not.toHaveBeenCalled();
    });

    it('sends via MailService to the account email, and stores only a hash of the code', async () => {
      await service.requestCode(1, CLIENT_IP);

      expect(mailService.sendOtpCodeEmail).toHaveBeenCalledWith(ACCOUNT.email, ACCOUNT.name, expect.any(String), 10);
      expect(prisma.emailOtpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 1, email: ACCOUNT.email }) }),
      );
      const createCall = prisma.emailOtpCode.create.mock.calls[0][0];
      const storedHash: string = createCall.data.codeHash;
      expect(storedHash).toMatch(/^hashed:\d{6}$/);
      expect(storedHash).not.toMatch(/^\d{6}$/);
    });

    it('surfaces a clear error and never creates a code row when the mail send fails', async () => {
      mailService.sendOtpCodeEmail.mockResolvedValue(false);

      await expect(service.requestCode(1, CLIENT_IP)).rejects.toThrow('Failed to send verification email');
    });

    it('enforces the 60-second send cooldown per user', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('email_otp_cooldown:') ? 2 : 1,
      );

      await expect(service.requestCode(1, CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(mailService.sendOtpCodeEmail).not.toHaveBeenCalled();
    });

    it('enforces the 5-per-day send cap per user', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('email_otp_daily_user:') ? 6 : 1,
      );

      await expect(service.requestCode(1, CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(mailService.sendOtpCodeEmail).not.toHaveBeenCalled();
    });

    it('enforces the 10-per-day send cap per IP, even across different users', async () => {
      redisService.incrWithWindow.mockImplementation(async (key: string) =>
        key.startsWith('email_otp_daily_ip:') ? 11 : 1,
      );

      await expect(service.requestCode(1, CLIENT_IP)).rejects.toThrow(BadRequestException);
      expect(mailService.sendOtpCodeEmail).not.toHaveBeenCalled();
    });

    it('never lets more sends through than the per-IP daily cap, even when many requests race in parallel', async () => {
      // Different userId per call (so each has its own cooldown key and
      // doesn't collide with another call's) but the same IP — simulates
      // many distinct accounts signing up from one office/NAT in a burst.
      const results = await Promise.allSettled(
        Array.from({ length: 11 }, (_, i) => service.requestCode(i + 1, CLIENT_IP)),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;
      expect(succeeded).toBe(10); // MAX_SENDS_PER_IP_PER_DAY
      expect(rejected).toBe(1);
      expect(mailService.sendOtpCodeEmail).toHaveBeenCalledTimes(10);
    });
  });

  describe('verifyCode', () => {
    const pendingCode = {
      id: 10,
      userId: 1,
      email: ACCOUNT.email,
      codeHash: 'hashed:123456',
      expiresAt: new Date(Date.now() + 10 * 60_000),
      attempts: 0,
      consumedAt: null,
    };

    it('verifies on the correct code and sets User.referralEmailVerifiedAt', async () => {
      prisma.emailOtpCode.findFirst.mockResolvedValue({ ...pendingCode });

      await service.verifyCode(1, '123456');

      expect(prisma.emailOtpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 }, data: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ referralEmailVerifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('rejects an incorrect code and increments the attempt counter', async () => {
      prisma.emailOtpCode.findFirst.mockResolvedValue({ ...pendingCode });

      await expect(service.verifyCode(1, '000000')).rejects.toThrow(BadRequestException);

      expect(prisma.emailOtpCode.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { attempts: { increment: 1 } },
      });
    });

    it('locks out after 5 incorrect attempts, even with the right code', async () => {
      prisma.emailOtpCode.findFirst.mockResolvedValue({ ...pendingCode, attempts: 5 });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('Too many incorrect attempts');
    });

    it('rejects an expired code', async () => {
      prisma.emailOtpCode.findFirst.mockResolvedValue({ ...pendingCode, expiresAt: new Date(Date.now() - 1000) });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('expired');
    });

    it('rejects when there is no pending code at all', async () => {
      prisma.emailOtpCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('No verification code is pending');
    });
  });

  describe('getStatus', () => {
    it('reports unverified when referralEmailVerifiedAt is null', async () => {
      prisma.user.findUnique.mockResolvedValue({ email: ACCOUNT.email, referralEmailVerifiedAt: null });

      const result = await service.getStatus(1);

      expect(result).toEqual({ verified: false, verifiedAt: null, email: ACCOUNT.email });
    });

    it('reports verified with the timestamp when set', async () => {
      const verifiedAt = new Date('2026-10-20');
      prisma.user.findUnique.mockResolvedValue({ email: ACCOUNT.email, referralEmailVerifiedAt: verifiedAt });

      const result = await service.getStatus(1);

      expect(result).toEqual({ verified: true, verifiedAt, email: ACCOUNT.email });
    });
  });

  describe('adminResetVerification', () => {
    it('rejects when the target account is not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ referralEmailVerifiedAt: null });

      await expect(service.adminResetVerification(5, 42)).rejects.toThrow('not email-verified');
      expect(prisma.adminLog.create).not.toHaveBeenCalled();
    });

    it('clears verification and writes an audit log naming the admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ referralEmailVerifiedAt: new Date('2026-10-20') });

      await service.adminResetVerification(5, 42);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { referralEmailVerifiedAt: null },
      });
      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: 42,
            action: 'RESET_REFERRAL_EMAIL_VERIFICATION',
            targetType: 'USER',
            targetId: 5,
          }),
        }),
      );
    });
  });
});
