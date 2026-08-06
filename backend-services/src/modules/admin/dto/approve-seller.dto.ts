// placeholder for src/modules/admin/dto/approve-seller.dto.ts
import { IsBoolean, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ApproveSellerDto {
  @IsBoolean()
  @IsNotEmpty({ message: 'Approval status is required' })
  isApproved: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}