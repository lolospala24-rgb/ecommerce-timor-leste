// placeholder for src/modules/products/dto/filter-product.dto.ts
import { IsOptional, IsString, IsInt, IsNumber, Min, Max, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProductDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sellerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean = true;

  // Tri-state status filter for admin use (Public findAll() still defaults
  // to active-only via isActive above when this is omitted — storefront
  // callers never send this). 'all' is the only way to see both active and
  // inactive products in one request; isActive alone can't express "no
  // filter" since its own default is `true`.
  @IsOptional()
  @IsEnum(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  // Same idea for stock, layered on top of the existing `inStock` boolean
  // (kept as-is for existing callers e.g. the storefront's in-stock-only
  // toggle). Takes precedence over `inStock` when present, including 'all'
  // explicitly clearing any stock filter. 'lowStock' reuses each product's
  // own lowStockThreshold (see ProductsService.findAll) rather than a new
  // hardcoded threshold.
  @IsOptional()
  @IsEnum(['all', 'inStock', 'outOfStock', 'lowStock'])
  stockStatus?: 'all' | 'inStock' | 'outOfStock' | 'lowStock';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLocallyMade?: boolean;

  // Matches a product's RESOLVED origin (its own custom origin, or its
  // seller's origin when the product uses SELLER_ORIGIN) — see
  // ProductsService.resolveOrigin. Not a Municipality FK/id — origin data
  // is plain text, independent of the Shipping Municipality system.
  @IsOptional()
  @IsString()
  originMunicipality?: string;
}