import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateShippingSettingDto {
  @IsNumber()
  defaultShippingCost: number;

  @IsNumber()
  freeShippingThreshold: number;

  @IsBoolean()
  @IsOptional()
  enableLocalPickup?: boolean;
}
