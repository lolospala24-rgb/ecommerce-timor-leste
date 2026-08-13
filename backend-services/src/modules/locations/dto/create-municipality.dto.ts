import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMunicipalityDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  code?: string;
}
