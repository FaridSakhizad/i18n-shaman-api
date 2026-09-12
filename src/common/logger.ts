import { AsyncLocalStorage } from 'node:async_hooks';
import pino, { Logger } from 'pino';
import { getApiConfig } from '../config/env';

export type LogContext = {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
};

const storage = new AsyncLocalStorage<LogContext>();
const config = getApiConfig();

export const appLogger = pino({
  name: 'i18nshaman-api',
  level: config.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  base: {
    service: 'i18nshaman-api',
    environment: config.NODE_ENV,
  },
  redact: {
    censor: '[REDACTED]',
    paths: [
      'password',
      'newPassword',
      'oldPassword',
      'token',
      'resetToken',
      'verificationToken',
      'cookie',
      'cookies',
      'headers.cookie',
      'headers.authorization',
      'req.headers.cookie',
      'req.headers.authorization',
      'session',
      'sessionId',
      'mongoUrl',
      'mongoConnectionUrl',
      'smtp.auth.pass',
      '*.password',
      '*.token',
      '*.resetToken',
      '*.verificationToken',
    ],
  },
});

export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getLogContext(): LogContext {
  return storage.getStore() || {};
}

export function getLogger(bindings: Record<string, unknown> = {}): Logger {
  return appLogger.child({
    ...getLogContext(),
    ...bindings,
  });
}

export async function withOperationLog<T>(
  operation: string,
  bindings: Record<string, unknown>,
  callback: () => Promise<T>,
): Promise<T> {
  const logger = getLogger({ operation, ...bindings });
  const startedAt = Date.now();

  logger.info({ event: `${operation}_started` }, `${operation} started`);

  try {
    const result = await callback();

    logger.info(
      {
        event: `${operation}_completed`,
        durationMs: Date.now() - startedAt,
      },
      `${operation} completed`,
    );

    return result;
  } catch (error) {
    logger.error(
      {
        event: `${operation}_failed`,
        durationMs: Date.now() - startedAt,
        err: error,
      },
      `${operation} failed`,
    );

    throw error;
  }
}
