import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, Min, Max } from 'class-validator';

// Every field is optional: the admin Settings page's tabs each submit only
// the subset they own (general/payment/system/email), and this DTO backs a
// single PATCH-style update against the one SystemSettings row.
export class SystemSettingsDto {
  // General / store identity
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsString()
  @IsOptional()
  siteDescription?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFee?: number;

  // System toggles
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @IsString()
  @IsOptional()
  maintenanceMessage?: string;

  @IsBoolean()
  @IsOptional()
  registrationOpen?: boolean;

  @IsBoolean()
  @IsOptional()
  sellerVerificationRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  enableReviews?: boolean;

  @IsBoolean()
  @IsOptional()
  requireReviewApproval?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxProductImages?: number;

  // Payment methods
  @IsBoolean()
  @IsOptional()
  enableCOD?: boolean;

  @IsBoolean()
  @IsOptional()
  enableBankTransfer?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minCODOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxCODOrderAmount?: number;

  @IsBoolean()
  @IsOptional()
  autoConfirmBankTransfer?: boolean;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankIBAN?: string;

  @IsString()
  @IsOptional()
  bankSWIFT?: string;

  @IsString()
  @IsOptional()
  bankTransferInstructions?: string;

  // Outbound email (SMTP)
  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  // Omit this field entirely to keep the stored password unchanged — the
  // admin UI never round-trips the real value back into the form, only a
  // masked placeholder, so there's no way to distinguish "unchanged" from
  // "cleared" other than by treating "not sent" as "unchanged".
  @IsString()
  @IsOptional()
  smtpPassword?: string;

  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @IsEmail()
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsBoolean()
  @IsOptional()
  sendOrderConfirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  sendPaymentConfirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  sendShippingUpdate?: boolean;

  @IsBoolean()
  @IsOptional()
  sendWelcomeEmail?: boolean;
}
