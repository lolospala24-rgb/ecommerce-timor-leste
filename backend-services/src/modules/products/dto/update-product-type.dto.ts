import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateProductTypeDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

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
  @MaxLength(100)
  slug?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsObject()
  @IsOptional()
  specFields?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Pass [] to clear all links and make the type global again.
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  categoryIds?: number[];
}