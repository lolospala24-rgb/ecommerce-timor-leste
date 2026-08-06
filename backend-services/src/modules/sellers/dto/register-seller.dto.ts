// placeholder for src/modules/sellers/dto/register-seller.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class RegisterSellerDto {
  // User fields
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

  // Seller fields
  @IsString()
  @IsNotEmpty({ message: 'Store name is required' })
  @MinLength(2, { message: 'Store name must be at least 2 characters long' })
  @MaxLength(100)
  storeName: string;

  @IsString()
  @IsNotEmpty({ message: 'Store phone is required' })
  @Matches(/^[+]?[0-9]{8,15}$/, {
    message: 'Please provide a valid store phone number',
  })
  storePhone: string;

  @IsEmail({}, { message: 'Please provide a valid store email' })
  @IsOptional()
  storeEmail?: string;

  @IsString()
  @IsNotEmpty({ message: 'Store address is required' })
  @MinLength(10, { message: 'Store address must be at least 10 characters long' })
  storeAddress: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}