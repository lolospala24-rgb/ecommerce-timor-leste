// placeholder for src/modules/carts/dto/add-to-cart.dto.ts
import { IsInt, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  variantId?: number;
}