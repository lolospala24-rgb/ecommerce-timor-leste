import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateMunicipalityDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsNotEmpty()
  @IsInt()
  provinceId: number;
}
