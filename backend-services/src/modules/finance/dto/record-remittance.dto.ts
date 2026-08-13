import { IsIn, IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordRemittanceDto {
  @IsIn(['shipping', 'tax'])
  bucket: 'shipping' | 'tax';

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
