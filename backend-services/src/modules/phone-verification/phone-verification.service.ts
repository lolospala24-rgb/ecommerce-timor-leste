import { randomInt } from 'crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SmsProvider, SMS_PROVIDER } from '../../common/sms/sms-provider.interface';
import { normalizeToTimorE164 } from '../../common/utils/phone.util';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt.util';

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const SEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_DAY = 5;
const ONE_DAY_SECONDS = 24 * 60 * 60;

// One message for every "can't send you a code right now" reason (phone
// already verified on another account, or any rate limit hit) — a caller
// must not be able to tell the difference between "that number is taken"
// and "you're sending too fast", since the former would let someone probe
// which phone numbers are already registered.
const SEND_REJECTED_MESSAGE =
  "This phone number can't be verified right now. Please try again later or use a different number.";

@Injectable()
export class PhoneVerificationService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    @Inject(SMS_PROVIDER) private smsProvider: SmsProvider,
  ) {}

  async requestCode(userId: number, rawPhone: string): Promise<void> {
    const phone = normalizeToTimorE164(rawPhone);
    if (!phone) {
      throw new BadRequestException('Please provide a valid Timor-Leste mobile number.');
    }

    const existingOwner = await this.prisma.user.findUnique({
      where: { verifiedPhone: phone },
      select: { id: true },
    });
    if (existingOwner && existingOwner.id !== userId) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    const cooldownKey = `phone_otp_cooldown:${phone}`;
    if (await this.redisService.get(cooldownKey)) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    const dailyPhoneKey = `phone_otp_daily:${phone}`;
    const dailyUserKey = `phone_otp_daily_user:${userId}`;
    const [phoneSendsToday, userSendsToday] = await Promise.all([
      this.redisService.get(dailyPhoneKey),
      this.redisService.get(dailyUserKey),
    ]);
    const phoneCount = parseInt(phoneSendsToday || '0', 10);
    const userCount = parseInt(userSendsToday || '0', 10);
    if (phoneCount >= MAX_SENDS_PER_DAY || userCount >= MAX_SENDS_PER_DAY) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

    await this.prisma.phoneVerificationCode.create({
      data: { userId, phone, codeHash, expiresAt },
    });

    await this.smsProvider.sendSms(
      phone,
      `Your Lolospala verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
    );

    // Rate-limit bookkeeping only after a successful send — a failed SMS
    // provider call shouldn't burn the user's quota.
    await Promise.all([
      this.redisService.set(cooldownKey, '1', SEND_COOLDOWN_SECONDS),
      this.redisService.set(dailyPhoneKey, String(phoneCount + 1), ONE_DAY_SECONDS),
      this.redisService.set(dailyUserKey, String(userCount + 1), ONE_DAY_SECONDS),
    ]);
  }

  async verifyCode(userId: number, rawCode: string): Promise<void> {
    const latest = await this.prisma.phoneVerificationCode.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      throw new BadRequestException('No verification code is pending — request a new one.');
    }
    if (latest.expiresAt < new Date()) {
      throw new BadRequestException('This code has expired — request a new one.');
    }
    if (latest.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts — request a new code.');
    }

    const matches = await comparePassword(rawCode, latest.codeHash);
    if (!matches) {
      await this.prisma.phoneVerificationCode.update({
        where: { id: latest.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code.');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.phoneVerificationCode.update({
          where: { id: latest.id },
          data: { consumedAt: new Date() },
        });
        await tx.user.update({
          where: { id: userId },
          data: { verifiedPhone: latest.phone, phoneVerifiedAt: new Date() },
        });
      });
    } catch (error) {
      // Last-resort race guard — requestCode's proactive check already
      // blocks the normal case, but two verification flows for the same
      // number finishing concurrently could still both reach here; the
      // database's own unique constraint on User.verifiedPhone is the
      // real backstop, this just turns it into a clean error instead of
      // a raw 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('This phone number was just verified on another account.');
      }
      throw error;
    }
  }

  async getStatus(userId: number): Promise<{ verifiedPhone: string | null; phoneVerifiedAt: Date | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verifiedPhone: true, phoneVerifiedAt: true },
    });
    return { verifiedPhone: user?.verifiedPhone ?? null, phoneVerifiedAt: user?.phoneVerifiedAt ?? null };
  }
}
