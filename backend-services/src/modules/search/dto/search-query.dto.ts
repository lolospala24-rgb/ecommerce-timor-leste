// placeholder for src/modules/search/dto/search-query.dto.ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsString()
  @IsOptional()
  @IsEnum(['products', 'sellers', 'categories'])
  type?: 'products' | 'sellers' | 'categories';

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
}

export class AiSearchQueryDto {
  @IsString()
  q: string;

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
}

export class AdvancedSearchDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

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
  @Type(() => Number)
  @IsInt()
  sellerId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'popularity'])
  sortBy?: string = 'relevance';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

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
}

export class SearchResponseDto {
  query: string;
  total: number;
  page: number;
  limit: number;
  results: {
    products?: any;
    sellers?: any;
    categories?: any;
  };
}

export class AutocompleteResponseDto {
  products: Array<{
    type: string;
    id: number;
    name: string;
    nameTetum: string | null;
    image: string | null;
    price: number;
  }>;
  categories: Array<{
    type: string;
    id: number;
    name: string;
    nameTetum: string | null;
  }>;
  sellers: Array<{
    type: string;
    id: number;
    name: string;
    image: string | null;
  }>;
}