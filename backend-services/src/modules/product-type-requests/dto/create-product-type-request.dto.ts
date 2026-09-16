import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProductTypeRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameTetum?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  // `{ fieldName: "select" }` — same shape as ProductType.fields, carried
  // over as-is into the real ProductType if this request is approved.
  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsObject()
  @IsOptional()
  specFields?: Record<string, any>;
}
