// backend-services/src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsPositive,
  IsUrl,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameTetum?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  descriptionTetum?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  comparePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  cost?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  videoUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  specifications?: Record<string, unknown>;

  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  typeId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sellerId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}