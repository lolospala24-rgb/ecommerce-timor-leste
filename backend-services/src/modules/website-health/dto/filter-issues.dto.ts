import { IsIn, IsOptional, IsString } from 'class-validator';

export class FilterIssuesDto {
  @IsIn(['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO', 'SECURITY'])
  @IsOptional()
  category?: string;

  @IsIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  @IsOptional()
  severity?: string;

  @IsIn(['OPEN', 'RESOLVED', 'IGNORED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
