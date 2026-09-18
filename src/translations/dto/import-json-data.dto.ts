import { IsArray, IsString } from 'class-validator';

export class ImportJsonDataDto {
  @IsString()
  projectId: string;

  @IsArray()
  files: [any];
}
