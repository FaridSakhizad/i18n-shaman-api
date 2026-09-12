import * as mongoose from 'mongoose';
import { getApiConfig } from '../config/env';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(getApiConfig().MONGO_URI),
  },
];
