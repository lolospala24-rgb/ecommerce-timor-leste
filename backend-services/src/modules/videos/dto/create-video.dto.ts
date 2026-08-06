import { IsString, IsOptional, IsUrl, IsInt, IsBoolean } from 'class-validator';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
