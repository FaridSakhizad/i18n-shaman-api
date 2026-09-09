import * as mongoose from 'mongoose';

const getMongoConnectionUrl = () => {
  if (process.env.MONGO_CONNECTION_URL) {
    return process.env.MONGO_CONNECTION_URL;
  }

  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const mongoDbName = process.env.MONGO_DB_NAME || 'i18nShaman';

  return `${mongoUrl.replace(/\/$/, '')}/${mongoDbName}`;
};

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(getMongoConnectionUrl()),
  },
];
