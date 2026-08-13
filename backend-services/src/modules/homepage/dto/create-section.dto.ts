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

export class SectionProductInputDto {
  @IsInt()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  position?: number;
}

export class CreateSectionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string;

  @IsEnum(HomepageSectionRule)
  rule: HomepageSectionRule;

  // Shape depends on `rule` (e.g. { categoryId } for LOCAL/CATEGORY,
  // { stockThreshold } for LIMITED_STOCK) — validated in the service against
  // the chosen rule rather than here, since the required keys vary per rule.
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

  // Only meaningful when rule = MANUAL.
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionProductInputDto)
  products?: SectionProductInputDto[];
}
