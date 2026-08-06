// placeholder for src/modules/carts/dto/update-cart.dto.ts
import { IsInt, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(0)
  @Max(99)
  @Type(() => Number)
  quantity: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  variantId?: number;
}