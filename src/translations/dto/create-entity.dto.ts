import { IsArray, IsString } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  projectId: string;

  @IsString()
  parentId: string;

  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsArray()
  values: [
    {
      id: string;
      languageId: string;
      value: string;
    },
  ];

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsString()
  pathCache: string;
}
