import { IsObject, IsString } from 'class-validator';
import { IUserPreferences } from '../interfaces/user.interface';

export class SetLanguageDto {
  @IsString()
  language: string;
}

export class SetPreferencesDto {
  @IsObject()
  data: IUserPreferences;
}
