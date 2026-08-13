import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsObject,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HomepageSectionRule } from '@prisma/client';
import { SectionProductInputDto } from './create-section.dto';

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string;

  @IsEnum(HomepageSectionRule)
  @IsOptional()
  rule?: HomepageSectionRule;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  sort?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  productLimit?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionProductInputDto)
  products?: SectionProductInputDto[];
}
