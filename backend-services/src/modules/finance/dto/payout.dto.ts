import { IsNumber, IsOptional, IsString, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestPayoutDto {
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}

export class AdminCreatePayoutDto {
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}

export class ApprovePayoutDto {
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class RejectPayoutDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
