import { NestFactory } from '@nestjs/core';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MongoStore = require('connect-mongo');

import { AppModule } from './app.module';
import { ProblemDetailsExceptionFilter } from './common/problem-details-exception.filter';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTENT_URL;
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const mongoDbName = process.env.MONGO_DB_NAME || 'i18nShaman';
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SECRET || (isProduction ? null : 'development-session-secret');

  if (!sessionSecret) {
    throw new Error('SECRET environment variable is required in production.');
  }

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.use(cookieParser());

  app.use(
    session({
      store: MongoStore.create({
        mongoUrl,
        dbName: mongoDbName,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60,
        stringify: false,
        serialize: (session) => session,
        unserialize: (session) => session,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
      },
    }),
  );

  await app.listen(process.env.PORT);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
