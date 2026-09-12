import './config/load-env';

import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';

import { AppModule } from './app.module';
import { ProblemDetailsExceptionFilter } from './common/problem-details-exception.filter';
import { appLogger } from './common/logger';
import { requestLoggingMiddleware } from './common/request-logging.middleware';
import { getApiConfig } from './config/env';

declare const module: any;

async function bootstrap() {
  const config = getApiConfig();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());

  app.enableCors({
    origin: config.FRONTEND_URL,
    credentials: true,
  });

  app.use(cookieParser());

  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: config.MONGO_URI,
        dbName: config.MONGO_DB_NAME,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60,
        stringify: false,
        serialize: (session) => session,
        unserialize: (session) => session,
      }),
      secret: config.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        sameSite: config.IS_PRODUCTION ? 'none' : 'lax',
        secure: config.IS_PRODUCTION,
      },
    }),
  );

  app.use(requestLoggingMiddleware);

  await app.listen(config.PORT);

  appLogger.info(
    {
      event: 'api_started',
      port: config.PORT,
      frontendUrl: config.FRONTEND_URL,
      production: config.IS_PRODUCTION,
    },
    'api started',
  );

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((error) => {
  appLogger.fatal({ event: 'api_start_failed', err: error }, 'api failed to start');
  process.exit(1);
});
