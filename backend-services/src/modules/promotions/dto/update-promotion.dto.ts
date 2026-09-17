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

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(PromotionDiscountType)
  @IsOptional()
  discountType?: PromotionDiscountType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  discountValue?: number;

  @IsDateString()
  @IsOptional()
  startAt?: string;

  @IsDateString()
  @IsOptional()
  endAt?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ArrayNotEmpty({ message: 'Select at least one product' })
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  productIds?: number[];
}
