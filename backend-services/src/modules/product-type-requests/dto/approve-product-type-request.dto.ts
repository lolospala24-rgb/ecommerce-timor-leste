import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// All fields optional — an admin can approve as-is, or clean up the
// seller's raw submission (e.g. fix a name collision, dedupe field names)
// before it becomes the real, shared ProductType. Omitted fields fall back
// to whatever the seller originally submitted.
export class ApproveProductTypeRequestDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameTetum?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsObject()
  @IsOptional()
  specFields?: Record<string, any>;
}
