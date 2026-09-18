import { IsString, IsNotEmpty, IsOptional, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth: string;
}

// Matches the browser's native PushSubscription.toJSON() shape exactly —
// the frontend sends that object as-is, no reshaping on either side.
export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  endpoint: string;
}
