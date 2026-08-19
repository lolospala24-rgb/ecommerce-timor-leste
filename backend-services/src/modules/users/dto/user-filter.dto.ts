import { IsOptional, IsString, IsInt, IsEnum, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'lastLoginAt'] as const;

export class UserFilterDto {
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
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  emailVerified?: boolean;

  // Reaches Prisma's orderBy as a literal key — must be restricted to real
  // columns rather than an arbitrary client-supplied string.
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: (typeof SORTABLE_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}