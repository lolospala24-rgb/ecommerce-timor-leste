import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CourierWebhookGuard } from './courier-webhook.guard';

function contextWithHeaders(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('CourierWebhookGuard', () => {
  const guard = new CourierWebhookGuard();
  const originalSecret = process.env.COURIER_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.COURIER_WEBHOOK_SECRET = originalSecret;
  });

  it('closes the endpoint entirely if no secret is configured, rather than allowing all requests through', () => {
    delete process.env.COURIER_WEBHOOK_SECRET;
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
  });

  it('rejects a request with no api key header', () => {
    process.env.COURIER_WEBHOOK_SECRET = 'real-secret';
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
  });

  it('rejects a request with the wrong api key', () => {
    process.env.COURIER_WEBHOOK_SECRET = 'real-secret';
    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-courier-api-key': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
  });

  it('allows a request with the exact configured secret', () => {
    process.env.COURIER_WEBHOOK_SECRET = 'real-secret';
    expect(guard.canActivate(contextWithHeaders({ 'x-courier-api-key': 'real-secret' }))).toBe(true);
  });
});
