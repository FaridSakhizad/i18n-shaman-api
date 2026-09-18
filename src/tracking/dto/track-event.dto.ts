import { IsIn, IsObject, IsOptional } from 'class-validator';
import { TRACKING_EVENTS, TrackingEventName } from '../tracking.events';

export type TrackingProperties = Record<string, string | number | boolean | null>;

export class TrackEventDto {
  @IsIn(TRACKING_EVENTS)
  event: TrackingEventName;

  @IsOptional()
  @IsObject()
  properties?: TrackingProperties;
}
