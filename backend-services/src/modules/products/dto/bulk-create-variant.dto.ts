import { ArrayMinSize, ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from './create-variant.dto';

// Backs the atomic "Generate Variants" bulk-create endpoint — every
// combination in `variants` is created in one database transaction (all or
// nothing), unlike POSTing each combination individually to the
// single-variant endpoint, where a mid-batch failure leaves the earlier
// combinations already committed.
export class BulkCreateVariantDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
