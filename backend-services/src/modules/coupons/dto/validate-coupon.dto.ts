import { IsString, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateCouponDto {
  @IsString()
  @MaxLength(30)
  code: string;

  // The cart subtotal to validate/compute the discount against — always
  // recomputed server-side from the customer's real cart in
  // OrdersService.create; this is only used for the pre-checkout preview.
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  subtotal: number;
}
