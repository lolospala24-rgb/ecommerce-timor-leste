import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuickMenuIconType, QuickMenuLinkType } from '@prisma/client';
import { QUICK_MENU_ICON_KEYS } from '../quick-menu.constants';

export class UpdateQuickMenuItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subtitle?: string;

  @IsEnum(QuickMenuIconType)
  @IsOptional()
  iconType?: QuickMenuIconType;

  // Presence/pairing with iconType is cross-checked in QuickMenuService,
  // same as CreateQuickMenuItemDto — see its doc-comment.
  @IsIn(QUICK_MENU_ICON_KEYS)
  @IsOptional()
  iconKey?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsEnum(QuickMenuLinkType)
  @IsOptional()
  linkType?: QuickMenuLinkType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  link?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  badge?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  openInNewTab?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
