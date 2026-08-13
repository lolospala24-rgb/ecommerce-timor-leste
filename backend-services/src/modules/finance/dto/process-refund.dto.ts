import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ApproveRefundDto {
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class RejectRefundDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
