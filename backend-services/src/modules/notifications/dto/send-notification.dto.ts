// placeholder for src/modules/notifications/dto/send-notification.dto.ts
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsString()
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'PROMO' | 'REVIEW';

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
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'PROMO' | 'REVIEW';

  @IsObject()
  @IsOptional()
  data?: any;

  @IsObject()
  @IsOptional()
  userFilter?: {
    role?: string;
    isActive?: boolean;
  };
}