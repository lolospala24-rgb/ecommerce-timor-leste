import { IsString, IsOptional, IsUrl, IsInt, IsBooleanString, IsIn, IsDateString } from 'class-validator';

const VIDEO_STATUSES = ['PENDING', 'PUBLISHED', 'SCHEDULED', 'REJECTED'] as const;
const VIDEO_VISIBILITIES = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const;

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsIn(VIDEO_STATUSES)
  status?: (typeof VIDEO_STATUSES)[number];

  @IsOptional()
  @IsIn(VIDEO_VISIBILITIES)
  visibility?: (typeof VIDEO_VISIBILITIES)[number];

  // Typed (and validated) as a string, not boolean, deliberately. These
  // always arrive as the literal strings "true"/"false" over multipart
  // form data (every admin save is multipart, since the video/thumbnail
  // file fields ride along in the same request). A `boolean`-typed
  // property here — even with an explicit @Transform normalizing the
  // string — hits a real bug in this project's class-transformer version
  // (0.5.1): the global pipe's enableImplicitConversion does its own
  // Boolean(value) coercion for any property whose *reflected* design
  // type is Boolean, and for a class with more than one such property it
  // clobbers @Transform's result on every property after the first back
  // to `true` (verified directly against the compiled output — not a
  // theoretical concern). Declaring the property as `string` sidesteps
  // the collision entirely: VideosService converts `=== 'true'` once it
  // has the validated DTO, same effective behavior, none of the bug.
  @IsOptional()
  @IsBooleanString()
  allowComments?: string;

  @IsOptional()
  @IsBooleanString()
  allowLikes?: string;

  @IsOptional()
  @IsBooleanString()
  allowSharing?: string;

  @IsOptional()
  @IsBooleanString()
  allowSave?: string;

  @IsOptional()
  @IsBooleanString()
  enableShopping?: string;

  // Required (and must be in the future) when status is SCHEDULED — set as
  // the actual "went live" timestamp when status is PUBLISHED. Validated
  // together with status in VideosService.resolvePublishedAt rather than
  // here, since the rule depends on both fields at once.
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
