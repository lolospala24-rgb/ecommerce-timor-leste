// placeholder for src/modules/orders/dto/order-filter.dto.ts
import { IsOptional, IsString, IsInt, IsEnum, IsIn, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus, ShippingStatus } from '@prisma/client';

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

  // Comma-separated so the admin live-tracking map can ask for
  // "BOOKED,IN_TRANSIT" in one request instead of one call per status.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsEnum(ShippingStatus, { each: true })
  shippingStatus?: ShippingStatus[];

  // "Only orders currently assigned to a driver" — the live-tracking map's
  // other half of "active delivery with someone to actually track".
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasDriver?: boolean;

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