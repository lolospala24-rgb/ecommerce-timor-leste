import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProvinceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  countryId?: number;
}
