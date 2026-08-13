// placeholder for src/modules/addresses/dto/create-address.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsPhoneNumber,
  MaxLength,
  MinLength,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  label?: string; // 'Home', 'Office', etc.

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  municipality: string; // Dili, Baucau, etc.

  @IsInt()
  @IsOptional()
  municipalityId?: number;

  @IsInt()
  @IsOptional()
  provinceId?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  postoAdmin: string; // Posto Administrativo

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  suco: string; // Suco

  @IsString()
  @IsOptional()
  @MaxLength(100)
  village?: string; // Aldeia

  @IsString()
  @IsOptional()
  @MaxLength(200)
  street?: string; // Street name

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reference?: string; // Near church, behind market, etc.

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}