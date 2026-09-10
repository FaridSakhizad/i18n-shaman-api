import * as mongoose from 'mongoose';
import { getMongoConnectionUrl } from '../config/env';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(getMongoConnectionUrl()),
  },
];
