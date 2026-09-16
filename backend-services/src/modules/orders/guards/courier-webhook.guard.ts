import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

// Secures the external-courier tracking webhook (@Public, so it skips the
// normal JWT guard entirely — a real courier's system has no customer/staff
// account to log in with). Authenticated by a shared secret instead, sent
// as a header. If COURIER_WEBHOOK_SECRET isn't configured, the endpoint is
// closed rather than silently open.
@Injectable()
export class CourierWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const configuredSecret = process.env.COURIER_WEBHOOK_SECRET;

    if (!configuredSecret) {
      throw new UnauthorizedException('Courier webhook is not configured');
    }

    const providedSecret = request.headers['x-courier-api-key'];
    if (!providedSecret || !this.secretsMatch(String(providedSecret), configuredSecret)) {
      throw new UnauthorizedException('Invalid courier API key');
    }

    return true;
  }

  // timingSafeEqual throws on mismatched buffer lengths, so the length is
  // checked separately first — a length mismatch alone doesn't need to be
  // constant-time, only the byte-by-byte comparison of same-length secrets does.
  private secretsMatch(provided: string, configured: string): boolean {
    const providedBuf = Buffer.from(provided);
    const configuredBuf = Buffer.from(configured);
    if (providedBuf.length !== configuredBuf.length) {
      return false;
    }
    return timingSafeEqual(providedBuf, configuredBuf);
  }
}
