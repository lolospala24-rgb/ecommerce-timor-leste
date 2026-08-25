// placeholder for src/modules/products/dto/update-product.dto.ts
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
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameTetum?: string;

  @IsString()
  @IsOptional()
  @MinLength(20)
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  descriptionTetum?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  price?: number;

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
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

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
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ValidateIf((o) => o.typeId !== null && o.typeId !== undefined)
  @IsInt()
  @Type(() => Number)
  typeId?: number | null;

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

  // Mirrors CreateProductDto.images — without this, edits made through the
  // full-array update flow (as opposed to the separate addImages/removeImage
  // endpoints) were silently stripped by the whitelist ValidationPipe and
  // never persisted.
  @IsArray()
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  length?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  width?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  height?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shippingClass?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  metaKeywords?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number | null;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  wholesaleMinQty?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  packagingName?: string | null;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  packagingUnitCount?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  packagingPrice?: number | null;
}