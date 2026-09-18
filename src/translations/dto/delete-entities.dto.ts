import { IsArray, IsString } from 'class-validator';

export class DeleteProjectEntitiesDto {
  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  entityIds: string[];
}
