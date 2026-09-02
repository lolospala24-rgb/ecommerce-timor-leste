import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import helmet from 'helmet';
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware (before CORS to avoid conflicts). This is a JSON
  // API (no HTML views), so helmet's default CSP is safe to enable — it
  // only constrains documents rendered from this origin, not the JSON
  // responses consumed cross-origin by the frontends.
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
  app.use(compression());
  app.use(cookieParser());
  
  // Enable CORS for known frontends only. `credentials: true` combined with
  // a wildcard/reflect-any origin would let any website make authenticated
  // requests on behalf of a logged-in user's cookies — so the allow-list is
  // explicit instead of `origin: true`.
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:3000',
    'http://localhost:3002',
  ].filter((origin): origin is string => Boolean(origin));

  app.use(cors({
    origin: (origin, callback) => {
      // No Origin header = same-origin/server-to-server/non-browser client.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Device-Id',
      'X-App-Version',
    ],
    exposedHeaders: ['Content-Length', 'X-JSON-Response'],
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Global filters. This order looks backwards but is correct: Nest's
  // RouterExceptionFilters.create() internally REVERSES the global filter
  // list before matching (see node_modules/@nestjs/core/router/router-
  // exception-filters.js), so the filter registered LAST is actually
  // checked FIRST. HttpExceptionFilter's bare @Catch() (matches anything)
  // must therefore be registered first and PrismaExceptionFilter's narrow
  // @Catch(...) second, or the catch-all always wins and Prisma-specific
  // error mapping never runs. Confirmed by live testing: with the previous
  // (intuitive-looking) order, a genuine PrismaClientKnownRequestError
  // (P2002) never reached PrismaExceptionFilter at all, even on a cold
  // process start with no prior hot-reload.
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
  
  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor(), new SentryInterceptor());
  
  // API prefix
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api/v1`);
  console.log(`📊 Prisma Studio: npx prisma studio`);
  console.log(`🐳 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
}
bootstrap();