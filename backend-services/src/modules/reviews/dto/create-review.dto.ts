// placeholder for src/modules/reviews/dto/create-review.dto.ts
import {
  IsInt,
  IsString,
  Min,
  Max,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsInt()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(10, { message: 'Review must be at least 10 characters' })
  @MaxLength(1000, { message: 'Review cannot exceed 1000 characters' })
  comment: string;
}