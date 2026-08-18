import { IsString, IsOptional, IsUrl, IsInt, IsBoolean, IsIn, IsDateString } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowLikes?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSave?: boolean;

  @IsOptional()
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
