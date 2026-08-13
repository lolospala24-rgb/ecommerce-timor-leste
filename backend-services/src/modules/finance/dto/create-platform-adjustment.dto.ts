import { IsIn, IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlatformAdjustmentDto {
  @IsIn(['commission', 'shippingHeld', 'shippingRemitted', 'taxHeld', 'taxRemitted'])
  bucket: 'commission' | 'shippingHeld' | 'shippingRemitted' | 'taxHeld' | 'taxRemitted';

  // Signed — negative reduces the bucket, positive increases it.
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
