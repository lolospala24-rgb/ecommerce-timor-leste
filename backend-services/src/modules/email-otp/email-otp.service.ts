import { randomInt } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt.util';
import { diliDayKey } from '../../common/utils/timezone.util';

const CODE_LENGTH = 6;
// Longer than the SMS OTP's 5 minutes — email delivery can lag more than
// SMS, especially across free/shared SMTP relays.
const CODE_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const ONE_DAY_SECONDS = 24 * 60 * 60;

const MAX_SENDS_PER_USER_PER_DAY = 5;
// Looser than per-user, same reasoning as PhoneVerificationService's
// per-IP cap — a shared-NAT IP can legitimately represent several real
// users, this is a backstop against gross abuse from one source only.
const MAX_SENDS_PER_IP_PER_DAY = 10;

const SEND_REJECTED_MESSAGE = "We can't send a verification code right now. Please try again later.";

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailService: MailService,
  ) {}

  async requestCode(userId: number, clientIp: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) {
      throw new BadRequestException('Account not found.');
    }

    // Atomic fixed-window counters, same primitive/reasoning as
    // PhoneVerificationService.requestCode — the 60s-window counter
    // doubles as a cooldown (count > 1 within it means "sent too
    // recently"). No per-email uniqueness check needed here (unlike
    // phone): User.email is already unique per account, so there's no
    // "this email belongs to someone else" case to guard against.
    const [cooldownCount, userDailyCount, ipDailyCount] = await Promise.all([
      this.redisService.incrWithWindow(`email_otp_cooldown:${userId}`, 60),
      this.redisService.incrWithWindow(`email_otp_daily_user:${userId}:${diliDayKey()}`, ONE_DAY_SECONDS),
      this.redisService.incrWithWindow(`email_otp_daily_ip:${clientIp}:${diliDayKey()}`, ONE_DAY_SECONDS),
    ]);

    if (
      cooldownCount > 1 ||
      userDailyCount > MAX_SENDS_PER_USER_PER_DAY ||
      ipDailyCount > MAX_SENDS_PER_IP_PER_DAY
    ) {
      throw new BadRequestException(SEND_REJECTED_MESSAGE);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

    await this.prisma.emailOtpCode.create({
      data: { userId, email: user.email, codeHash, expiresAt },
    });

    const sent = await this.mailService.sendOtpCodeEmail(user.email, user.name, code, CODE_TTL_MINUTES);
    if (!sent) {
      this.logger.error(`Failed to send email OTP to user ${userId} — SMTP send returned false.`);
      throw new BadRequestException('Failed to send verification email — please try again later.');
    }
  }

  async verifyCode(userId: number, rawCode: string): Promise<void> {
    const latest = await this.prisma.emailOtpCode.findFirst({
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
      await this.prisma.emailOtpCode.update({
        where: { id: latest.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailOtpCode.update({
        where: { id: latest.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { referralEmailVerifiedAt: new Date() },
      });
    });
  }

  async getStatus(userId: number): Promise<{ verified: boolean; verifiedAt: Date | null; email: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, referralEmailVerifiedAt: true },
    });
    return {
      verified: !!user?.referralEmailVerifiedAt,
      verifiedAt: user?.referralEmailVerifiedAt ?? null,
      email: user?.email ?? null,
    };
  }

  // Admin-only (enforced by AdminReferralsController's @Roles guard, not
  // here) — clears verification so support can have a user re-verify
  // (e.g. a shared/compromised inbox), same AdminLog audit pattern as
  // PhoneVerificationService.adminUnlinkPhone/RefundsService.approveRefund.
  async adminResetVerification(targetUserId: number, adminId: number): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { referralEmailVerifiedAt: true },
    });
    if (!target?.referralEmailVerifiedAt) {
      throw new BadRequestException('This account is not email-verified for referrals.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { referralEmailVerifiedAt: null },
      });
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'RESET_REFERRAL_EMAIL_VERIFICATION',
          targetType: 'USER',
          targetId: targetUserId,
          details: {},
        },
      });
    });
  }
}
