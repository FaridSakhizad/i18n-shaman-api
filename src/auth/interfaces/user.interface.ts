import { Document } from 'mongoose';
import { IUserPreferences } from '../../user/interfaces/user.interface';

export interface IUserSettings extends Document {
  language: string | undefined;
}

export interface IUser extends Document {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  active?: boolean;
  verified?: boolean;
  deleted?: boolean;
  settings: IUserSettings;
  preferences: IUserPreferences;
}

export interface IPublicUserData {
  id: string;
  email: string;
  settings?: IUserSettings;
  preferences?: IUserPreferences;
}

export interface IResetPasswordResponse {
  result: string;
}

export interface IUpdatePassword {
  securityToken: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ISession extends Document {
  expires: Date;
  session: object;
}
