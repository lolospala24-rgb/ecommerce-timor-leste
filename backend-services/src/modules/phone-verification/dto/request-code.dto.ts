import { IsString, MinLength } from 'class-validator';

export class RequestCodeDto {
  @IsString()
  @MinLength(7)
  phone: string;
}
