import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SectionOrderEntryDto {
  @IsInt()
  @Type(() => Number)
  id: number;

  @IsInt()
  @Type(() => Number)
  displayOrder: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderEntryDto)
  sections: SectionOrderEntryDto[];
}
