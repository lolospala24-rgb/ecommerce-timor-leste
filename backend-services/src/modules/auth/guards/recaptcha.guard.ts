import { Injectable, CanActivate, ExecutionContext, BadRequestException, Logger } from '@nestjs/common';

// Score-based (v3) verification for the login endpoint — a defense against
// distributed credential-stuffing that per-account lockout and per-IP
// throttling alone can't catch (an attacker rotating across enough IPs
// stays under both). Runs before LocalAuthGuard in the @UseGuards() list
// so a failing/low-score token never even reaches the bcrypt compare.
@Injectable()
export class RecaptchaGuard implements CanActivate {
  private readonly logger = new Logger(RecaptchaGuard.name);
  private readonly minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
      // Fail closed in production — an operator forgetting to set the
      // secret should surface immediately as "logins are down", not
      // silently ship with no brute-force protection at all. Fail open
      // everywhere else so local dev/CI never needs a real Google key.
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('RECAPTCHA_SECRET_KEY is not set — refusing all logins until configured');
        throw new BadRequestException('Login is temporarily unavailable. Please try again shortly.');
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.body?.recaptchaToken;

    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Missing verification token. Please refresh the page and try again.');
    }

    let result: { success: boolean; score?: number; ['error-codes']?: string[] };
    try {
      const params = new URLSearchParams({ secret, response: token });
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        signal: AbortSignal.timeout(5000),
      });
      result = await response.json();
    } catch (error) {
      // A network hiccup talking to Google must never lock every customer
      // out of the site — log it and let the request through this time.
      this.logger.warn(`reCAPTCHA verification request failed, allowing through: ${error instanceof Error ? error.message : error}`);
      return true;
    }

    if (!result.success || (result.score ?? 0) < this.minScore) {
      this.logger.warn(`reCAPTCHA rejected login (score: ${result.score ?? 'n/a'}, errors: ${result['error-codes']?.join(',') ?? 'none'})`);
      throw new BadRequestException('We could not verify you are human. Please try again.');
    }

    return true;
  }
}
