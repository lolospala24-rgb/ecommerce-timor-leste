import { IsEnum, IsNotEmpty } from 'class-validator';
import { ShippingStatus } from '@prisma/client';

// Driver-facing status update — the shipping-specific field, not the
// financial OrderStatus lifecycle (see OrdersService.updateShippingStatus).
export class UpdateShippingStatusDto {
  @IsEnum(ShippingStatus)
  @IsNotEmpty()
  shippingStatus: ShippingStatus;
}
