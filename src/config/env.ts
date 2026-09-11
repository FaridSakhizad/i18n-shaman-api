const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_DEV_MONGO_URL = 'mongodb://localhost:27017';
const DEFAULT_MONGO_DB_NAME = 'i18nShaman';
const DEFAULT_MONGO_AUTH_SOURCE = 'admin';
const DEFAULT_DEV_PORT = 4000;
const DEFAULT_SMTP_FROM = '"i18n Shaman" <no-reply@i18nshaman.io>';
const DEFAULT_LOG_LEVEL = 'info';

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

export function getLogLevel(): string {
  return process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
}

export function getFrontendUrl(): string {
  return requireInProduction('FRONTEND_URL', DEFAULT_DEV_FRONTEND_URL) as string;
}

export function getSessionSecret(): string {
  return requireInProduction('SECRET', 'development-session-secret') as string;
}

export function getMongoDbName(): string {
  return requireInProduction('MONGO_DB_NAME', DEFAULT_MONGO_DB_NAME) as string;
}

function getMongoCredentials(): { user: string; password: string; authSource: string } | null {
  const user = process.env.MONGO_DB_USER;
  const password = process.env.MONGO_DB_PASSWORD;

  if (!user && !password) {
    return null;
  }

  if (!user || !password) {
    throw new Error('MONGO_DB_USER and MONGO_DB_PASSWORD must be provided together.');
  }

  return {
    user,
    password,
    authSource: process.env.MONGO_AUTH_SOURCE || DEFAULT_MONGO_AUTH_SOURCE,
  };
}

function applyMongoCredentials(mongoUrl: string): string {
  const credentials = getMongoCredentials();

  if (!credentials) {
    return mongoUrl;
  }

  const url = new URL(mongoUrl);

  if (!url.username && !url.password) {
    url.username = credentials.user;
    url.password = credentials.password;
  }

  if (!url.searchParams.has('authSource')) {
    url.searchParams.set('authSource', credentials.authSource);
  }

  return url.toString();
}

export function getMongoConnectionUrl(): string {
  if (process.env.MONGO_CONNECTION_URL) {
    return process.env.MONGO_CONNECTION_URL;
  }

  const url = new URL(getMongoUrl());

  if (!url.pathname || url.pathname === '/') {
    url.pathname = `/${getMongoDbName()}`;
  }

  return url.toString();
}

export function getMongoUrl(): string {
  const mongoUrl = requireInProduction('MONGO_URL', DEFAULT_DEV_MONGO_URL) as string;

  return applyMongoCredentials(mongoUrl);
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
