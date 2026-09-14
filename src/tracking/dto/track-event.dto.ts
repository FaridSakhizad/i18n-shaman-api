import { TrackingEventName } from '../tracking.events';

export type TrackingProperties = Record<string, string | number | boolean | null>;

export class TrackEventDto {
  event: TrackingEventName;
  properties?: TrackingProperties;
}

