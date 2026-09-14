export const TRACKING_EVENTS = [
  'app_opened',
  'signup_completed',
  'email_verified',
  'login_completed',
  'project_created',
  'project_opened',
  'language_added',
  'language_switched',
  'key_created',
  'translation_updated',
  'search_used',
  'import_completed',
  'import_failed',
  'export_completed',
  'export_failed',
] as const;

export type TrackingEventName = (typeof TRACKING_EVENTS)[number];

export const TRACKING_EVENT_SET = new Set<string>(TRACKING_EVENTS);

