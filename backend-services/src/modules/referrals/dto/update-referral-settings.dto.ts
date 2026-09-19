import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

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
}
