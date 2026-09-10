import { NestFactory } from '@nestjs/core';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MongoStore = require('connect-mongo');

import { AppModule } from './app.module';
import { ProblemDetailsExceptionFilter } from './common/problem-details-exception.filter';
import {
  getFrontendUrl,
  getMongoDbName,
  getMongoUrl,
  getPort,
  getSessionSecret,
  isProduction,
} from './config/env';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  const production = isProduction();
  const frontendUrl = getFrontendUrl();
  const mongoUrl = getMongoUrl();
  const mongoDbName = getMongoDbName();
  const sessionSecret = getSessionSecret();

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
        sameSite: production ? 'none' : 'lax',
        secure: production,
      },
    }),
  );

  await app.listen(getPort());

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
