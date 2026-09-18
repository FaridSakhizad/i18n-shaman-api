import { IsBoolean, IsString } from 'class-validator';

export class LanguageVisibilityDto {
  @IsString()
  projectId: string;

  @IsString()
  languageId: string;

  @IsBoolean()
  visible: boolean;
}
