import { Request } from 'express';
import { ApiResponse } from './api-response.interface';

export function createApiResponse<T>(req: Request, data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId: req.headers['x-request-id'] as string,
    timestamp: new Date().toISOString(),
    path: req.url,
  };
}
