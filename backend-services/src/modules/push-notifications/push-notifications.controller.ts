import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { PushNotificationsService } from './push-notifications.service';
import { SubscribePushDto, UnsubscribePushDto } from './dto/subscribe-push.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('push')
export class PushNotificationsController {
  constructor(private readonly pushNotificationsService: PushNotificationsService) {}

  // Public — the VAPID public key is, by design, safe to ship to every
  // visitor (same trust level as a reCAPTCHA site key); only the private
  // key ever needs protecting, and that never leaves the server.
  @Public()
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { data: { publicKey: this.pushNotificationsService.getVapidPublicKey() } };
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser('id') userId: number,
    @Body() dto: SubscribePushDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    const data = await this.pushNotificationsService.subscribe(userId, dto, userAgent);
    return { message: 'Subscribed to push notifications', data };
  }

  @Post('unsubscribe')
  async unsubscribe(@CurrentUser('id') userId: number, @Body() dto: UnsubscribePushDto) {
    const data = await this.pushNotificationsService.unsubscribe(userId, dto.endpoint);
    return { message: 'Unsubscribed from push notifications', data };
  }
}
