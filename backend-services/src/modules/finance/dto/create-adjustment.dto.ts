import { IsInt, IsIn, IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAdjustmentDto {
  @IsInt()
  @Type(() => Number)
  sellerId: number;

  // 'processing' deliberately excluded — see FinanceService.createAdjustment.
  @IsIn(['pending', 'available', 'paidOut', 'refunded'])
  bucket: 'pending' | 'available' | 'paidOut' | 'refunded';

  // Signed — negative reduces the bucket, positive increases it.
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
