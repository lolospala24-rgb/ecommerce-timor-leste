import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

// Deliberately just observes and re-throws — never a Filter. This repo's
// global filter order is already order-sensitive and documented as fragile
// (see main.ts), so reporting to Sentry happens as a side effect in the
// interceptor chain instead of adding another filter to that chain. Every
// error still reaches HttpExceptionFilter/PrismaExceptionFilter completely
// unchanged; this only adds a captureException call before it does.
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next.handle().pipe(
      tap({
        error: (err) => {
          Sentry.captureException(err);
        },
      }),
    );
  }
}
