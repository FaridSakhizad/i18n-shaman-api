import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

export class LanguageVisibilityPartialDto {
  @IsString()
  languageId: string;

  @IsBoolean()
  visible: boolean;
}

export class MultipleLanguageVisibilityDto {
  @IsString()
  projectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageVisibilityPartialDto)
  data: LanguageVisibilityPartialDto[];
}
