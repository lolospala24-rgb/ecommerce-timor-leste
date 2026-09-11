import { IsArray, IsIn, IsOptional, ArrayNotEmpty } from 'class-validator';
import { AUDIT_TARGET_TEMPLATES } from '../constants/audit-targets';

const VALID_TEMPLATE_IDS = AUDIT_TARGET_TEMPLATES.map((t) => t.id);

export class CreateAuditDto {
  // Deliberately a list of fixed template ids, never a raw URL — see
  // audit-targets.ts's doc-comment for why free-form URLs are never
  // accepted here.
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VALID_TEMPLATE_IDS, { each: true })
  @IsOptional()
  scope?: string[];

  @IsIn(['mobile', 'desktop'])
  @IsOptional()
  device?: 'mobile' | 'desktop';
}
