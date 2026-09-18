import { IsArray, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  projectId: string;

  @IsString()
  tagName: string;
}

export class AddTagsToEntityDto {
  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  entityIds: string[];

  @IsString()
  tagName: string;

  @IsString()
  color: string;
}

export class AssignTagToEntitiesDto {
  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  entityIds: string[];

  @IsString()
  tagId: string;
}

export class DeleteTagDto {
  @IsString()
  projectId: string;

  @IsString()
  tagId: string;
}

export class EditTagDto {
  @IsString()
  projectId: string;

  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  color: string;

  @IsString()
  customColor: string;
}
