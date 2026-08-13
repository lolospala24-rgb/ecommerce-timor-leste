// placeholder for src/modules/sellers/dto/update-seller.dto.ts
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsEmail,
  Matches,
} from 'class-validator';

export class UpdateSellerDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Store name must be at least 2 characters long' })
  @MaxLength(100)
  storeName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[+]?[0-9]{8,15}$/, {
    message: 'Please provide a valid store phone number',
  })
  storePhone?: string;

  @IsEmail({}, { message: 'Please provide a valid store email' })
  @IsOptional()
  storeEmail?: string;

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Store address must be at least 10 characters long' })
  storeAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccountNumber?: string;
}