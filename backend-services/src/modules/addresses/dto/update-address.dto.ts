// placeholder for src/modules/addresses/dto/update-address.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsPhoneNumber,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';

export class UpdateAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  label?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  municipality?: string;

  @IsInt()
  @IsOptional()
  municipalityId?: number;

  @IsInt()
  @IsOptional()
  provinceId?: number;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  postoAdmin?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  suco?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  village?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  street?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reference?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}