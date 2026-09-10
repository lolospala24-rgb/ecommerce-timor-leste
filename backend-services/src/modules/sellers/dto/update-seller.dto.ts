// placeholder for src/modules/sellers/dto/update-seller.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  MaxLength,
  MinLength,
  IsEmail,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  // Captured from Google Places Autocomplete when available — independent
  // of the Shipping Municipality system, never validated/required.
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  storeLatitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  storeLongitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // Already-uploaded Cloudinary URLs — see RegisterSellerDto's doc-comment.
  // Lets admin set/fix a seller's logo/banner from the seller-detail page,
  // same as the seller's own dedicated /upload-logo /upload-banner routes.
  @IsUrl()
  @IsOptional()
  storeLogo?: string;

  @IsUrl()
  @IsOptional()
  storeBanner?: string;

  // See RegisterSellerDto's doc-comment.
  @IsString()
  @IsOptional()
  @MaxLength(100)
  originMunicipality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  originPostoAdmin?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  originSuco?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  originAldeia?: string;

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