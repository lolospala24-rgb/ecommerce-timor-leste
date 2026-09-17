import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionDiscountType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(PromotionDiscountType)
  discountType: PromotionDiscountType;

  // Range depends on discountType (percentage: 0-100, fixed: >0), so it's
  // validated in PromotionsService.validateDiscount rather than here.
  @IsNumber()
  @Type(() => Number)
  discountValue: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one product' })
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  productIds: number[];
}
