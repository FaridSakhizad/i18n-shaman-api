import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { appLogger, runWithLogContext } from './logger';

type RequestWithSession = Request & {
  session?: {
    userId?: unknown;
  };
};

function getRequestId(req: Request): string {
  const incomingRequestId = req.headers['x-request-id'];

  if (Array.isArray(incomingRequestId)) {
    return incomingRequestId[0] || randomUUID();
  }

  return incomingRequestId || randomUUID();
}

function getSessionUserId(req: RequestWithSession): string | undefined {
  if (!req.session?.userId) {
    return undefined;
  }

  return String(req.session.userId);
}

export function requestLoggingMiddleware(req: RequestWithSession, res: Response, next: NextFunction): void {
  const requestId = getRequestId(req);
  const method = req.method;
  const url = req.originalUrl || req.url;

  res.setHeader('x-request-id', requestId);

  const httpLogger = pinoHttp<RequestWithSession, Response>({
    logger: appLogger,
    genReqId: () => requestId,
    customAttributeKeys: {
      reqId: 'requestId',
      responseTime: 'durationMs',
    },
    customLogLevel: (_req, response, error) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      return 'info';
    },
    customReceivedMessage: () => 'request started',
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
    customReceivedObject: (request, _response, value) => ({
      ...value,
      event: 'request_started',
      method: request.method,
      url: request.originalUrl || request.url,
      userId: getSessionUserId(request),
    }),
    customSuccessObject: (request, response, value) => ({
      ...value,
      event: response.statusCode >= 500 ? 'request_failed' : 'request_completed',
      method: request.method,
      url: request.originalUrl || request.url,
      statusCode: response.statusCode,
      userId: getSessionUserId(request),
    }),
    customErrorObject: (request, response, error, value) => ({
      ...value,
      event: 'request_failed',
      method: request.method,
      url: request.originalUrl || request.url,
      statusCode: response.statusCode,
      userId: getSessionUserId(request),
      err: error,
    }),
  });

  httpLogger(req, res, () => {
    runWithLogContext({ requestId, method, url, userId: getSessionUserId(req) }, next);
  });
}
