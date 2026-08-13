import { IsInt, IsIn, IsString, IsNotEmpty, IsBoolean, Equals } from 'class-validator';
import { Type } from 'class-transformer';

export class ResyncBalanceDto {
  @IsInt()
  @Type(() => Number)
  sellerId: number;

  @IsIn(['pending', 'available', 'paidOut', 'refunded'])
  bucket: 'pending' | 'available' | 'paidOut' | 'refunded';

  @IsString()
  @IsNotEmpty()
  reason: string;

  // A resync forcibly overrides a stored balance rather than recording a
  // new event — cheap extra confirmation gate so it can't be triggered by
  // a stray click the way a normal Adjustment safely could be.
  @IsBoolean()
  @Equals(true, { message: 'confirm must be true — resync is a destructive override, not a normal adjustment' })
  confirm: boolean;
}
