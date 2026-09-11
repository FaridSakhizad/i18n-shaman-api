import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IUser } from './interfaces/user.interface';
import { normalizeUserPreferences } from './preferences';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_MODEL')
    private userModel: Model<IUser>,
  ) {}

  async setLanguage(userId: string, language: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        settings: {
          language: language,
        },
      },
      { runValidators: true },
    );

    return 'OK';
  }

  async savePreferences(userId: string, data: unknown) {
    const preferences = normalizeUserPreferences(data);

    await this.userModel.updateOne(
      { _id: userId },
      {
        preferences,
      },
      { runValidators: true },
    );

    return 'OK';
  }
}
