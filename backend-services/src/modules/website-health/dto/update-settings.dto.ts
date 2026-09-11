import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { AUDIT_TARGET_TEMPLATES } from '../constants/audit-targets';

const VALID_TEMPLATE_IDS = AUDIT_TARGET_TEMPLATES.map((t) => t.id);

export class UpdateWebsiteHealthSettingsDto {
  // Intentionally strict: this is the ONE value that controls what
  // ssrf-guard.util.ts will ever allow a request to target. Changing it is
  // a sensitive, logged action (spec §38), never something accepted from
  // any other endpoint.
  @IsUrl({ require_protocol: true, protocols: ['https', 'http'] })
  @IsOptional()
  baseUrl?: string;

  @IsInt() @Min(0) @Max(100) @IsOptional() weightPerformance?: number;
  @IsInt() @Min(0) @Max(100) @IsOptional() weightAccessibility?: number;
  @IsInt() @Min(0) @Max(100) @IsOptional() weightBestPractices?: number;
  @IsInt() @Min(0) @Max(100) @IsOptional() weightSeo?: number;
  @IsInt() @Min(0) @Max(100) @IsOptional() weightSecurity?: number;

  @IsArray()
  @IsIn(VALID_TEMPLATE_IDS, { each: true })
  @IsOptional()
  defaultScope?: string[];

  @IsInt() @Min(10) @Max(300) @IsOptional() timeoutSeconds?: number;
  @IsInt() @Min(1) @Max(3650) @IsOptional() retentionDays?: number;
}
