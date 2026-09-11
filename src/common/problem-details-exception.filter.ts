import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from '../interfaces';
import { getLogger } from './logger';

type ExceptionResponse = string | {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: ProblemDetails['errors'];
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse() as ExceptionResponse
      : null;

    const title = this.getTitle(exceptionResponse, status);
    const detail = this.getDetail(exceptionResponse, exception);
    const errors = this.getErrors(exceptionResponse);

    const problemDetails: ProblemDetails = {
      type: '',
      title,
      status,
      detail,
      code: String(status),
      errors,
      requestId: request.headers['x-request-id'] as string,
      timestamp: new Date().toISOString(),
      instance: request.url,
    };

    this.logException(exception, request, status, problemDetails.requestId);

    response.status(status).json(problemDetails);
  }

  private logException(exception: unknown, request: Request, status: number, requestId?: string): void {
    const logger = getLogger({
      context: 'ProblemDetailsExceptionFilter',
      requestId,
      method: request.method,
      url: request.originalUrl || request.url,
      statusCode: status,
    });

    const logData = {
      event: status >= 500 ? 'request_failed' : 'request_rejected',
      err: exception,
    };

    if (status >= 500) {
      logger.error(logData, 'request failed');
      return;
    }

    logger.debug(logData, 'request rejected');
  }

  private getTitle(exceptionResponse: ExceptionResponse | null, status: number): string {
    if (exceptionResponse && typeof exceptionResponse !== 'string' && exceptionResponse.error) {
      return exceptionResponse.error;
    }

    return HttpStatus[status] || 'Error';
  }

  private getDetail(exceptionResponse: ExceptionResponse | null, exception: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse?.message) {
      return Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message.join(', ')
        : exceptionResponse.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unexpected error';
  }

  private getErrors(exceptionResponse: ExceptionResponse | null): ProblemDetails['errors'] {
    if (exceptionResponse && typeof exceptionResponse !== 'string' && exceptionResponse.errors) {
      return exceptionResponse.errors;
    }

    if (exceptionResponse && typeof exceptionResponse !== 'string' && Array.isArray(exceptionResponse.message)) {
      return exceptionResponse.message.map((message) => ({ field: '', message }));
    }

    return [];
  }
}
