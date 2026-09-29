import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuickMenuOrderEntryDto {
  @IsInt()
  @Type(() => Number)
  id: number;

  @IsInt()
  @Type(() => Number)
  displayOrder: number;
}

export class ReorderQuickMenuDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickMenuOrderEntryDto)
  items: QuickMenuOrderEntryDto[];
}
