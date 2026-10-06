import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AddProjectLanguageDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  code: string;

  @IsBoolean()
  baseLanguage: boolean;

  @IsBoolean()
  visible: boolean;

  @IsOptional()
  @IsBoolean()
  customCodeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  customLabelEnabled?: boolean;

  @IsOptional()
  @IsString()
  customCode?: string;

  @IsOptional()
  @IsString()
  customLabel?: string;
}

export class AddMultipleLanguagesDto {
  @IsString()
  projectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddProjectLanguageDto)
  languages: AddProjectLanguageDto[];
}
