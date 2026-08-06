// placeholder for src/modules/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^[+]?[0-9]{8,15}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @IsEnum(Role, { message: 'Invalid role' })
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;
}