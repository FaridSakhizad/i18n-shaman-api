import { IUserPreferences } from '../interfaces/user.interface';

export class SetLanguageDto {
  language: string;
}

export class SetPreferencesDto {
  data: IUserPreferences;
}
