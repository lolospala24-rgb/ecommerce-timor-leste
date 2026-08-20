import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CouponDiscountType } from '@prisma/client';

export class CreateCouponDto {
  // Uppercased/trimmed in the service before every read and write, so this
  // just rejects characters that would be confusing or unsafe in a code a
  // customer types by hand (spaces, punctuation).
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Coupon code can only contain letters, numbers, hyphens, and underscores',
  })
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minPurchaseAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  usageLimitPerUser?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
