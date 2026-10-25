import { randomInt } from 'crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SmsProvider, SMS_PROVIDER } from '../../common/sms/sms-provider.interface';
import { normalizeToTimorE164 } from '../../common/utils/phone.util';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt.util';
import { diliDayKey, startOfDiliDay, startOfDiliMonth } from '../../common/utils/timezone.util';

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const ONE_DAY_SECONDS = 24 * 60 * 60;

const MAX_SENDS_PER_PHONE_PER_DAY = 5;
const MAX_SENDS_PER_USER_PER_DAY = 5;
// Looser than per-phone/per-user — a shared-NAT IP can legitimately
// represent several real users, so this exists purely as a backstop
// against gross abuse from one source, not as a tight per-identity limit.
const MAX_SENDS_PER_IP_PER_DAY = 10;
const DEFAULT_SMS_DAILY_GLOBAL_CAP = 200;

// One message for every "can't send you a code right now" reason (phone
// already verified on another account, or any rate limit hit) — a caller
// must not be able to tell the difference between "that number is taken"
// and "you're sending too fast", since the former would let someone probe
// which phone numbers are already registered.
const SEND_REJECTED_MESSAGE =
  "This phone number can't be verified right now. Please try again later or use a different number.";
const GLOBAL_CAP_MESSAGE = 'Servisu verifikasaun okupadu, koko fali aban.';

// e.g. "+67077123456" -> "+67077****56" — keeps enough to be useful for
// a support conversation ("a number ending in 56") without retaining a
// full number in SmsLog, which exists purely for cost/usage visibility,
// not for contacting anyone.
function maskPhone(e164: string): string {
  if (e164.length < 8) return '****';
  return `${e164.slice(0, 6)}****${e164.slice(-2)}`;
}

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private configService: ConfigService,
    @Inject(SMS_PROVIDER) private smsProvider: SmsProvider,
  ) {}

  async requestCode(userId: number, rawPhone: string, clientIp: string): Promise<void> {
    const normalized = normalizeToTimorE164(rawPhone);
    // Explicit `=== false` (not `!normalized.ok`) — this project's
    // tsconfig has strictNullChecks off, which makes TS's discriminated-
    // union narrowing unreliable through negation/implicit-else; an
    // explicit literal comparison narrows correctly regardless.
    if (normalized.ok === false) {
      throw new BadRequestException(
        normalized.reason === 'TOO_SHORT'
          ? 'Numeru seluler tenke 8 dígitu.'
          : 'Please provide a valid Timor-Leste mobile number.',
      );
    }
    const phone = normalized.phone;

    const existingOwner = await this.prisma.user.findUnique({
      where: { verifiedPhone: phone },
      select: { id: true },
    });
    if (existingOwner && existingOwner.id !== userId) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    // Atomic fixed-window counters — see RedisService.incrWithWindow's
    // doc-comment for why this matters here specifically (real carrier
    // cost per message, unlike the plain get+set pattern used for
    // lower-stakes lockout counters elsewhere). The 60s-window phone
    // counter doubles as the old separate "cooldown" check: count > 1
    // within that window already means "sent too recently".
    const [phoneWindowCount, phoneDailyCount, userDailyCount, ipDailyCount, globalDailyCount] = await Promise.all([
      this.redisService.incrWithWindow(`phone_otp_cooldown:${phone}`, 60),
      this.redisService.incrWithWindow(`phone_otp_daily:${phone}:${diliDayKey()}`, ONE_DAY_SECONDS),
      this.redisService.incrWithWindow(`phone_otp_daily_user:${userId}:${diliDayKey()}`, ONE_DAY_SECONDS),
      this.redisService.incrWithWindow(`phone_otp_daily_ip:${clientIp}:${diliDayKey()}`, ONE_DAY_SECONDS),
      this.redisService.incrWithWindow(`sms_global_daily:${diliDayKey()}`, ONE_DAY_SECONDS),
    ]);

    const globalCap = Number(this.configService.get('SMS_DAILY_GLOBAL_CAP') ?? DEFAULT_SMS_DAILY_GLOBAL_CAP);
    if (globalDailyCount > globalCap) {
      this.logger.warn(`SMS global daily cap (${globalCap}) reached — rejecting further OTP sends today.`);
      throw new BadRequestException(GLOBAL_CAP_MESSAGE);
    }
    if (
      phoneWindowCount > 1 ||
      phoneDailyCount > MAX_SENDS_PER_PHONE_PER_DAY ||
      userDailyCount > MAX_SENDS_PER_USER_PER_DAY ||
      ipDailyCount > MAX_SENDS_PER_IP_PER_DAY
    ) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

    await this.prisma.phoneVerificationCode.create({
      data: { userId, phone, codeHash, expiresAt },
    });

    const message = `LOLOSPALA: Ita-nia kodigu verifikasaun mak ${code}. Validu minutu ${CODE_TTL_MINUTES}. Labele fahe ba ema seluk.`;

    try {
      await this.smsProvider.sendSms(phone, message);
    } catch (error) {
      await this.prisma.smsLog.create({
        data: { userId, phoneMasked: maskPhone(phone), status: 'FAILED' },
      });
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to send verification code.');
    }

    await this.prisma.smsLog.create({
      data: { userId, phoneMasked: maskPhone(phone), status: 'SENT' },
    });
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

  // Admin-only (enforced by AdminReferralsController's @Roles guard, not
  // here) — clears a verified phone so it can be re-verified on a
  // different account, e.g. a family sharing one number. Always audit
  // logged via the same AdminLog model/pattern RefundsService.approveRefund
  // already uses — no new audit mechanism introduced.
  async adminUnlinkPhone(targetUserId: number, adminId: number): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { verifiedPhone: true },
    });
    if (!target?.verifiedPhone) {
      throw new BadRequestException('This account has no verified phone number to unlink.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { verifiedPhone: null, phoneVerifiedAt: null },
      });
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'UNLINK_VERIFIED_PHONE',
          targetType: 'USER',
          targetId: targetUserId,
          details: { unlinkedPhone: target.verifiedPhone },
        },
      });
    });
  }

  async getSmsUsageSummary(): Promise<{ today: number; thisMonth: number }> {
    const [today, thisMonth] = await Promise.all([
      this.prisma.smsLog.count({ where: { status: 'SENT', createdAt: { gte: startOfDiliDay() } } }),
      this.prisma.smsLog.count({ where: { status: 'SENT', createdAt: { gte: startOfDiliMonth() } } }),
    ]);
    return { today, thisMonth };
  }
}
