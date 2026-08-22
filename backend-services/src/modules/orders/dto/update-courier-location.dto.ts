import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Posted by the assigned driver's own device (browser geolocation) while a
// delivery is in progress. Deliberately separate from Order.deliveryLatitude/
// deliveryLongitude (the frozen destination pin) — this is the courier's
// current, constantly-changing position, never the customer's address.
export class UpdateCourierLocationDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;
}
