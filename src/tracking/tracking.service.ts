import { BadRequestException, Injectable } from '@nestjs/common';
import { getApiConfig } from '../config/env';
import { getLogger } from '../common/logger';
import { TrackEventDto, TrackingProperties } from './dto/track-event.dto';
import { TRACKING_EVENT_SET } from './tracking.events';

const MAX_PROPERTIES = 24;
const MAX_STRING_LENGTH = 160;

@Injectable()
export class TrackingService {
  private readonly config = getApiConfig();

  track(dto: TrackEventDto, userId?: string): void {
    if (!TRACKING_EVENT_SET.has(dto.event)) {
      throw new BadRequestException({
        error: 'Invalid Tracking Event',
        message: 'Tracking event is not supported',
      });
    }

    const properties = this.sanitizeProperties(dto.properties || {});

    getLogger({ context: 'TrackingService' }).info(
      {
        event: 'product_event',
        productEvent: dto.event,
        userId,
        properties,
      },
      'product event tracked',
    );

    void this.forwardToProvider(dto.event, properties, userId);
  }

  private async forwardToProvider(event: string, properties: TrackingProperties, userId?: string): Promise<void> {
    const logger = getLogger({ context: 'TrackingService' });
    const { TRACKING_PROVIDER_URL, TRACKING_PROVIDER_SECRET } = this.config;

    if (!TRACKING_PROVIDER_URL) {
      return;
    }

    try {
      const response = await fetch(TRACKING_PROVIDER_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(TRACKING_PROVIDER_SECRET ? { 'x-tracking-provider-secret': TRACKING_PROVIDER_SECRET } : {}),
        },
        body: JSON.stringify({
          event,
          userId,
          properties,
        }),
      });

      if (!response.ok) {
        logger.warn({
          event: 'tracking_provider_forward_failed',
          productEvent: event,
          statusCode: response.status,
        }, 'tracking provider forward failed');
      }
    } catch (error) {
      logger.warn({
        event: 'tracking_provider_forward_failed',
        productEvent: event,
        err: error,
      }, 'tracking provider forward failed');
    }
  }

  private sanitizeProperties(properties: TrackingProperties): TrackingProperties {
    return Object.entries(properties)
      .slice(0, MAX_PROPERTIES)
      .reduce<TrackingProperties>((result, [key, value]) => {
        if (!this.isSafePropertyKey(key) || !this.isSafePropertyValue(value)) {
          return result;
        }

        result[key] = typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : value;

        return result;
      }, {});
  }

  private isSafePropertyKey(key: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key);
  }

  private isSafePropertyValue(value: unknown): value is string | number | boolean | null {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
  }
}
