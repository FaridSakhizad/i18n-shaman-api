import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const RATE_LIMIT_OPTIONS = 'rate_limit_options';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_OPTIONS, options);

const buckets = new Map<string, RateLimitBucket>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_OPTIONS, context.getHandler());

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const key = this.getRequestKey(request, options);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      return true;
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getRequestKey(request, options: RateLimitOptions): string {
    const userId = request.session?.userId ? String(request.session.userId) : '';
    const email = typeof request.body?.email === 'string' ? request.body.email.toLowerCase().trim() : '';
    const ip = this.getRequestIp(request);
    const subject = userId || email || ip || 'unknown';

    return `${options.keyPrefix || request.path}:${subject}`;
  }

  private getRequestIp(request): string {
    const cloudflareIp = request.headers?.['cf-connecting-ip'];
    const forwardedFor = request.headers?.['x-forwarded-for'];

    if (typeof cloudflareIp === 'string' && cloudflareIp.length > 0) {
      return cloudflareIp;
    }

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip || request.socket?.remoteAddress || '';
  }
}
