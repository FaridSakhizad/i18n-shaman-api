import { Request } from 'express';
import { ApiResponse } from '../interfaces';

export function createApiResponse<T>(req: Request, data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId: req.headers['x-request-id'] as string,
    timestamp: new Date().toISOString(),
    path: req.url,
  };
}
