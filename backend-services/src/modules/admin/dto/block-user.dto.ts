// placeholder for src/modules/admin/dto/block-user.dto.ts
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class BlockUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}