import { IsArray, IsString } from 'class-validator';

export class UpdateKeyDto {
  @IsString()
  id: string;

  @IsString()
  projectId: string;

  @IsString()
  parentId: string;

  @IsString()
  label: string;

  @IsString()
  description: string;

  @IsArray()
  values: [
    {
      id: string;
      languageId: string;
      value: string;
      pathCache?: string;
    },
  ];
}
