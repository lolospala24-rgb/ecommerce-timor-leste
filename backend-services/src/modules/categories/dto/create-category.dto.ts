// placeholder for src/modules/categories/dto/create-category.dto.ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameTetum?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsOptional()
  filterConfig?: unknown;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  parentId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  order?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;
}