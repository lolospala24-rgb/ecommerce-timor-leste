// placeholder for src/modules/users/dto/update-user.dto.ts
import {
  IsEmail,
  IsString,
  MaxLength,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(100)
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[+]?[0-9]{8,15}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}