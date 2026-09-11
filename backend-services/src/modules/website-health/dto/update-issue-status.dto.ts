import { IsIn } from 'class-validator';

export class UpdateIssueStatusDto {
  @IsIn(['OPEN', 'RESOLVED', 'IGNORED'])
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
}
