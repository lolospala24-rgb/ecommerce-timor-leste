import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

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
    if (!providedSecret || providedSecret !== configuredSecret) {
      throw new UnauthorizedException('Invalid courier API key');
    }

    return true;
  }
}
