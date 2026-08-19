import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class HeroBannerOrderEntryDto {
  @IsInt()
  @Type(() => Number)
  id: number;

  @IsInt()
  @Type(() => Number)
  position: number;
}

export class ReorderHeroBannersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroBannerOrderEntryDto)
  banners: HeroBannerOrderEntryDto[];
}
