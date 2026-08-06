// placeholder for src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    const notification = await this.notificationsService.sendNotification(sendNotificationDto);
    return { message: 'Notification sent successfully', data: notification };
  }
  @Post('broadcast')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async broadcastNotification(
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type: string,
    @Body('data') data?: any,
  ) {
    const result = await this.notificationsService.broadcastNotification({
      title,
      message,
      type,
      data,
    });
    return { message: 'Broadcast notification sent', data: result };
  }
  @Get()
  async getUserNotifications(
    @CurrentUser('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly: boolean,
    @Query('type') type?: string,
  ) {
    const result = await this.notificationsService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
      type,
    });
    return result;
  }

  @Get('unread/count')
  async getUnreadCount(@CurrentUser('id') userId: number) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { data: { count } };
  }
  @Get(':id')
  async getNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const notification = await this.notificationsService.getNotification(id, userId);
    return { data: notification };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read', data: notification };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser('id') userId: number) {
    const count = await this.notificationsService.markAllAsRead(userId);
    return { message: `Marked ${count} notifications as read`, data: { count } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    await this.notificationsService.deleteNotification(id, userId, userRole);
  }

  @Delete('clear/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllNotifications(@CurrentUser('id') userId: number) {
    await this.notificationsService.clearAllNotifications(userId);
  }

  // Admin endpoints for managing notifications
  @Get('admin/all')
  @Roles(Role.ADMIN)
  async getAllNotifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.notificationsService.getAllNotifications({ page, limit });
    return result;
  }

  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteNotification(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.adminDeleteNotification(id);
  }
}