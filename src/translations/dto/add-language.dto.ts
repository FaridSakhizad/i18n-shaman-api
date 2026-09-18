import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AddLanguageDto {
  @IsString()
  projectId: string;

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
