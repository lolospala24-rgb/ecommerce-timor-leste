import { Body, Controller, Get, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { EmailOtpService } from './email-otp.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifyCodeDto } from './dto/verify-code.dto';

// Same nginx-aware IP extraction as PhoneVerificationController/VideosController.
function getClientIp(req: Request): string {
  return (
    (req.headers['x-real-ip'] as string) ||
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.ip ||
    'unknown'
  );
}

// No @Public() anywhere here — the global JwtAuthGuard requires login,
// same reasoning as PhoneVerificationController: this verifies the
// caller's own account email, never an arbitrary one.
@Controller('account/email-otp')
export class EmailOtpController {
  constructor(private readonly emailOtpService: EmailOtpService) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: number) {
    const data = await this.emailOtpService.getStatus(userId);
    return { data };
  }

  // Tighter than the global default — same defense-in-depth reasoning as
  // PhoneVerificationController; requestCode's own cooldown/daily-cap
  // logic is the real guard.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  async requestCode(@CurrentUser('id') userId: number, @Req() req: Request) {
    await this.emailOtpService.requestCode(userId, getClientIp(req));
    return { message: 'Verification code sent' };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@CurrentUser('id') userId: number, @Body() dto: VerifyCodeDto) {
    await this.emailOtpService.verifyCode(userId, dto.code);
    return { message: 'Email verified' };
  }
}
