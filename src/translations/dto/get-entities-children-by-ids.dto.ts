import { IsArray, IsString } from 'class-validator';

export class GetEntitiesChildrenByIdsDto {
  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
