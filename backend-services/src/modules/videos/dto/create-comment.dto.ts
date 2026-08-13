import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
