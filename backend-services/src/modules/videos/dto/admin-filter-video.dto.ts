import { IsOptional, IsIn, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

// Mirrors FilterVideoDto's validation style, applied to the admin table's
// query params — previously these arrived as raw, unvalidated @Query()
// strings with manual parseInt (e.g. a non-numeric sellerId became NaN
// and flowed straight into the Prisma `where`).
export class AdminFilterVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PUBLISHED', 'SCHEDULED', 'REJECTED', 'all'])
  status?: 'PENDING' | 'PUBLISHED' | 'SCHEDULED' | 'REJECTED' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sellerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'views', 'likes', 'comments'])
  sortBy?: 'createdAt' | 'views' | 'likes' | 'comments';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
