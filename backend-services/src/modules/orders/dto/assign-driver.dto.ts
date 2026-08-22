import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignDriverDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  driverId: number;
}
