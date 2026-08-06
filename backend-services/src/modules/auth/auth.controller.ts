// placeholder for src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Auth tokens live in httpOnly cookies so client-side JS can never read
  // them (closes the XSS-token-theft gap). `domain` is optional — set
  // COOKIE_DOMAIN only in production if the API and frontends share a
  // parent domain (e.g. `.example.com`); left unset it defaults to a
  // host-only cookie, which is what local development needs.
  private cookieOptions(maxAgeMs: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeMs,
      domain: process.env.COOKIE_DOMAIN || undefined,
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_COOKIE, accessToken, this.cookieOptions(24 * 60 * 60 * 1000));
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions(7 * 24 * 60 * 60 * 1000));
  }

  private clearAuthCookies(res: Response) {
    const { maxAge, ...clearOptions } = this.cookieOptions(0);
    res.clearCookie(ACCESS_COOKIE, clearOptions);
    res.clearCookie(REFRESH_COOKIE, clearOptions);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return {
      message: 'Registration successful. Please verify your email.',
      data: user,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, ...safeResult } = await this.authService.login(req.user);
    this.setAuthCookies(res, access_token, refresh_token);
    return safeResult;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Request() req,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] || refreshTokenDto?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token not provided');
    }
    const { access_token, refresh_token, ...safeResult } = await this.authService.refreshToken(token);
    this.setAuthCookies(res, access_token, refresh_token);
    return safeResult;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: number,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken =
      req.cookies?.[ACCESS_COOKIE] || req.headers?.authorization?.split(' ')[1];
    await this.authService.logout(userId, accessToken);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: 'Password reset email sent if account exists' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return { message: 'Password reset successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendVerificationEmail(email);
    return { message: 'Verification email sent' };
  }
}