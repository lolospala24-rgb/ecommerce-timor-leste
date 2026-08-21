import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { AdminModule } from './modules/admin/admin.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CartsModule } from './modules/carts/carts.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { UploadModule } from './modules/upload/upload.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { LocationsModule } from './modules/locations/locations.module';
import { CouriersModule } from './modules/couriers/couriers.module';
import { VideosModule } from './modules/videos/videos.module';
import { HomepageModule } from './modules/homepage/homepage.module';
import { HeroModule } from './modules/hero/hero.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { FinanceModule } from './modules/finance/finance.module';
import { StockNotificationsModule } from './modules/stock-notifications/stock-notifications.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Powers PaymentExpiryJob's @Cron — nothing else uses it today.
    ScheduleModule.forRoot(),
    // Global rate limit as a baseline abuse guard for every endpoint.
    // Sensitive public auth endpoints (register, password reset, etc.)
    // additionally set tighter per-route limits via @Throttle(). This is
    // shared per-IP across the whole API, including every parallel widget
    // query a dashboard page fires and both frontends in local dev, so it
    // has to stay well above normal legitimate traffic — the per-route
    // limits above are the actual abuse defense, not this one.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 600,
      },
    ]),
    PrismaModule,
    RedisModule,
    CloudinaryModule,
    MailModule,
    AuthModule,
    UsersModule,
    SellersModule,
    AdminModule,
    SettingsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    AddressesModule,
    CartsModule,
    ReviewsModule,
    DashboardModule,
    NotificationsModule,
    SearchModule,
    UploadModule,
    WishlistModule,
    ReportsModule,
    ShippingModule,
    LocationsModule,
    CouriersModule,
    VideosModule,
    HomepageModule,
    HeroModule,
    CouponsModule,
    FinanceModule,
    StockNotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule {}
