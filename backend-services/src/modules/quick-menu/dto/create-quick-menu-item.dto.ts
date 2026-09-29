import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  IsEnum,
  IsDateString,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuickMenuIconType, QuickMenuLinkType } from '@prisma/client';
import { QUICK_MENU_ICON_KEYS } from '../quick-menu.constants';

export class CreateQuickMenuItemDto {
  @IsString()
  @MaxLength(60)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subtitle?: string;

  @IsEnum(QuickMenuIconType)
  @IsOptional()
  iconType?: QuickMenuIconType;

  // Required when iconType is LIBRARY (or omitted, since LIBRARY is the
  // default) — one of the fixed, curated Lolospala icon keys, never an
  // arbitrary string. (Presence — required-when-LIBRARY — is enforced here;
  // QuickMenuService also cross-checks iconKey/iconUrl against the
  // resolved iconType so a request can't send both or neither.)
  @ValidateIf((o) => (o.iconType ?? QuickMenuIconType.LIBRARY) === QuickMenuIconType.LIBRARY)
  @IsIn(QUICK_MENU_ICON_KEYS)
  iconKey?: string;

  // Required when iconType is UPLOAD — the URL returned by
  // POST /quick-menu/upload-icon, submitted here the same way HeroBanner's
  // desktopImage is (uploaded first, URL attached on create/update).
  @ValidateIf((o) => o.iconType === QuickMenuIconType.UPLOAD)
  @IsString()
  iconUrl?: string;

  @IsEnum(QuickMenuLinkType)
  @IsOptional()
  linkType?: QuickMenuLinkType;

  // Shape depends on linkType (internal path vs external URL) — validated
  // in QuickMenuService rather than here, since class-validator doesn't
  // reliably support two independently-conditioned validators on one
  // property. The backend has no access to the frontend's route tree
  // either way, so an internal link is checked for shape ("/..."), not
  // whether it actually resolves to a real page.
  @IsString()
  @MaxLength(255)
  link: string;

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
