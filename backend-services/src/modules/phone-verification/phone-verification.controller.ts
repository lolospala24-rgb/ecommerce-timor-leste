import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PhoneVerificationService } from './phone-verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

// No @Public() anywhere here — the global JwtAuthGuard requires login,
// which is correct: a phone gets verified onto the caller's own account,
// never an arbitrary one.
@Controller('account/phone')
export class PhoneVerificationController {
  constructor(private readonly phoneVerificationService: PhoneVerificationService) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: number) {
    const data = await this.phoneVerificationService.getStatus(userId);
    return { data };
  }

  // Tighter than the global default (600/min) — SMS sends cost real money
  // per message, same reasoning as the video-comment throttle elsewhere in
  // this codebase. requestCode's own cooldown/daily-cap logic is the real
  // guard; this is defense in depth against burst abuse.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  async requestCode(@CurrentUser('id') userId: number, @Body() dto: RequestCodeDto) {
    await this.phoneVerificationService.requestCode(userId, dto.phone);
    return { message: 'Verification code sent' };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@CurrentUser('id') userId: number, @Body() dto: VerifyCodeDto) {
    await this.phoneVerificationService.verifyCode(userId, dto.code);
    return { message: 'Phone number verified' };
  }
}
