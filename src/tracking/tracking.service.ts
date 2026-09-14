import { BadRequestException, Injectable } from '@nestjs/common';
import { getLogger } from '../common/logger';
import { TrackEventDto, TrackingProperties } from './dto/track-event.dto';
import { TRACKING_EVENT_SET } from './tracking.events';

const MAX_PROPERTIES = 24;
const MAX_STRING_LENGTH = 160;

@Injectable()
export class TrackingService {
  track(dto: TrackEventDto, userId?: string): void {
    if (!TRACKING_EVENT_SET.has(dto.event)) {
      throw new BadRequestException({
        error: 'Invalid Tracking Event',
        message: 'Tracking event is not supported',
      });
    }

    getLogger({ context: 'TrackingService' }).info(
      {
        event: 'product_event',
        productEvent: dto.event,
        userId,
        properties: this.sanitizeProperties(dto.properties || {}),
      },
      'product event tracked',
    );
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

