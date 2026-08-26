import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHeroBannerDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  badge?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  subtitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  buttonText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  buttonUrl?: string;

  @IsString()
  @IsOptional()
  desktopImage?: string;

  @IsString()
  @IsOptional()
  mobileImage?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  position?: number;

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
