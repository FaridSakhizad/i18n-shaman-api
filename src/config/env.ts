import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const ENV_SCHEMA = {
  NODE_ENV: { type: 'string', values: ['development', 'production', 'test'] },
  LOG_LEVEL: { type: 'string', values: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] },
  PORT: { type: 'number' },
  FRONTEND_URL: { type: 'string' },
  SECRET: { type: 'string' },
  MONGO_HOST: { type: 'string' },
  MONGO_PORT: { type: 'number' },
  MONGO_DB_NAME: { type: 'string' },
  MONGO_DB_USER: { type: 'string' },
  MONGO_DB_PASSWORD: { type: 'string' },
  MONGO_AUTH_SOURCE: { type: 'string' },
  SMTP_HOST: { type: 'string' },
  SMTP_PORT: { type: 'number', values: ['465', '587'] },
  SMTP_USER: { type: 'string' },
  SMTP_PASS: { type: 'string' },
  SMTP_FROM: { type: 'string' },
  TRACKING_PROVIDER_URL: { type: 'string', optional: true },
  TRACKING_PROVIDER_SECRET: { type: 'string', optional: true },
} as const;

type EnvKey = keyof typeof ENV_SCHEMA;

type EnvValue<Key extends EnvKey> = typeof ENV_SCHEMA[Key]['type'] extends 'number'
  ? number | undefined
  : string | undefined;
type EnvValues = {
  [Key in EnvKey]: EnvValue<Key>;
};

const readEnv = (): EnvValues => {
  const env = {} as EnvValues;
  const writableEnv = env as Record<string, string | number | undefined>;

  for (const [key, config] of Object.entries(ENV_SCHEMA)) {
    const value = process.env[key];

    if (!value && !('optional' in config && config.optional)) {
      console.warn(`[config] ${key} is not set.`);
    }

    if (value && 'values' in config && !(config.values as readonly string[]).includes(value)) {
      console.warn(`[config] ${key} should be one of: ${(config.values as readonly string[]).join(', ')}.`);
    }

    writableEnv[key] = config.type === 'number' && value ? Number(value) : value;
  }

  return env;
};

const buildMongoUri = (env: EnvValues) => {
  const {
    MONGO_DB_USER = '',
    MONGO_DB_PASSWORD = '',
    MONGO_HOST = '',
    MONGO_PORT = '',
    MONGO_DB_NAME = '',
    MONGO_AUTH_SOURCE = '',
  } = env;

  return (
    `mongodb://${MONGO_DB_USER}:${MONGO_DB_PASSWORD}`
    + `@${MONGO_HOST}:${MONGO_PORT}`
    + `/${MONGO_DB_NAME}`
    + `?authSource=${MONGO_AUTH_SOURCE}`
  );
};

export const getApiConfig = () => {
  const env = readEnv();

  return {
    ...env,
    MONGO_URI: buildMongoUri(env),
    IS_PRODUCTION: env.NODE_ENV === 'production',
    SMTP: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      from: env.SMTP_FROM,
    },
  };
};
