import { IsString, IsOptional, IsUrl, IsInt, IsBoolean, IsIn, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

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

  // These arrive as the literal strings "true"/"false" over multipart form
  // data (every admin save is multipart, since the video/thumbnail file
  // fields ride along in the same request) — without this transform, the
  // global pipe's implicit conversion does a bare Boolean(value), and
  // Boolean("false") is true. Every toggle would silently force itself
  // back on on every save.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  allowLikes?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  allowSharing?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  allowSave?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  enableShopping?: boolean;

  // Required (and must be in the future) when status is SCHEDULED — set as
  // the actual "went live" timestamp when status is PUBLISHED. Validated
  // together with status in VideosService.resolvePublishedAt rather than
  // here, since the rule depends on both fields at once.
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
