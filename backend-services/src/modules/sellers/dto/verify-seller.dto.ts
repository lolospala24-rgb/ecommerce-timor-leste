// placeholder for src/modules/sellers/dto/verify-seller.dto.ts
import { IsBoolean, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class VerifySellerDto {
  @IsBoolean()
  @IsNotEmpty({ message: 'Approval status is required' })
  isApproved: boolean;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}