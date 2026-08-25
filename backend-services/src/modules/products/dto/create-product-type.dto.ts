import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProductTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
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
  @MaxLength(100)
  slug?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  // Suggested specification fields (Material, Warranty, ...) for this
  // type — advisory only, shown as quick-add suggestions in the admin
  // specifications editor. Distinct from `fields`, which drives variant
  // option pickers (Color/Size) instead.
  @IsObject()
  @IsOptional()
  specFields?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}