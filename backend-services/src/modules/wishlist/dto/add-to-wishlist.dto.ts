import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToWishlistDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  productId: number;
}
