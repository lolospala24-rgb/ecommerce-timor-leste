// placeholder for src/modules/notifications/dto/send-notification.dto.ts
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export class SendNotificationDto {
  @IsInt()
  @Type(() => Number)
  userId: number;

  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title: string;

  @IsString()
  @MinLength(5, { message: 'Message must be at least 5 characters' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message: string;

  // Specific event name — kept a free string (not an enum) since it's an
  // open-ended, growing set of event identifiers (see NotificationEvent in
  // notifications.constants.ts); `category` below is the closed, filterable
  // domain grouping.
  @IsString()
  type: string;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  entityId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  actorId?: number;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean = false;
}

export class BroadcastNotificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  message: string;

  @IsString()
  type: string;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  entityId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  actorId?: number;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean = false;

  @IsObject()
  @IsOptional()
  userFilter?: {
    role?: string;
    isActive?: boolean;
  };
}