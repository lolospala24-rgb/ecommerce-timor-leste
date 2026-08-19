// placeholder for src/modules/orders/dto/order-filter.dto.ts
import { IsOptional, IsString, IsInt, IsEnum, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'total', 'status', 'orderNumber'] as const;

export class OrderFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  // Reaches Prisma's orderBy as a literal key ([sortBy]: sortOrder) — must
  // be restricted to real, intended columns rather than an arbitrary
  // client-supplied string.
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: (typeof SORTABLE_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}