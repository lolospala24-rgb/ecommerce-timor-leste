// placeholder for src/modules/admin/dto/admin-stats.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class AdminStatsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month' | 'year';
}