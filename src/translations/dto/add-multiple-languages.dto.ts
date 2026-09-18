import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { AddLanguageDto } from './add-language.dto';

export class AddMultipleLanguagesDto {
  @IsString()
  projectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddLanguageDto)
  languages: AddLanguageDto[];
}
