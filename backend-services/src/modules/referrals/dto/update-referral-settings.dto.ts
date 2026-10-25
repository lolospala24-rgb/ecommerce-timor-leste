import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

// Thin, referral-scoped subset of SystemSettingsDto — backs the dedicated
// admin Referral Settings screen. Internally forwarded into
// SettingsService.updateSettings() so SystemSettings stays the single
// source of truth (no parallel config table).
export class UpdateReferralSettingsDto {
  @IsBoolean()
  @IsOptional()
  referralProgramEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  referralWelcomeCredit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  referralRewardAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  referralHoldDays?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  referralMinQualifyingAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  referralMonthlyCap?: number;

  @IsBoolean()
  @IsOptional()
  referralRequirePhoneVerification?: boolean;
}
