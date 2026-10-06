import { IsArray, IsString } from 'class-validator';

export class MoveProjectEntitiesDto {
  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  entityIds: string[];

  @IsString()
  destinationEntityId: string;
}
