const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_DEV_MONGO_URL = 'mongodb://localhost:27017';
const DEFAULT_MONGO_DB_NAME = 'i18nshaman';
const DEFAULT_DEV_PORT = 4000;
const DEFAULT_SMTP_FROM = '"i18n Shaman" <no-reply@i18nshaman.io>';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}

function requireInProduction(name: string, devFallback?: string): string | undefined {
  if (isProduction()) {
    return requireEnv(name);
  }

  return process.env[name] || devFallback;
}

export function getPort(): number {
  return Number(process.env.PORT || DEFAULT_DEV_PORT);
}

export function getFrontendUrl(): string {
  return requireInProduction('FRONTEND_URL', DEFAULT_DEV_FRONTEND_URL) as string;
}

export function getSessionSecret(): string {
  return requireInProduction('SECRET', 'development-session-secret') as string;
}

export function getMongoUrl(): string {
  return requireInProduction('MONGO_URL', DEFAULT_DEV_MONGO_URL) as string;
}

export function getMongoDbName(): string {
  return requireInProduction('MONGO_DB_NAME', DEFAULT_MONGO_DB_NAME) as string;
}

export function getMongoConnectionUrl(): string {
  if (process.env.MONGO_CONNECTION_URL) {
    return process.env.MONGO_CONNECTION_URL;
  }

  return `${getMongoUrl().replace(/\/$/, '')}/${getMongoDbName()}`;
}

export function getSmtpConfig() {
  const host = requireInProduction('SMTP_HOST');
  const port = Number(requireInProduction('SMTP_PORT') || 465);
  const user = requireInProduction('SMTP_USER');
  const pass = requireInProduction('SMTP_PASS');

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from: process.env.SMTP_FROM || DEFAULT_SMTP_FROM,
  };
}
