const EXPECTED_ENV_KEYS = [
  'NODE_ENV',
  'LOG_LEVEL',
  'PORT',
  'FRONTEND_URL',
  'SECRET',
  'MONGO_HOST',
  'MONGO_PORT',
  'MONGO_DB_NAME',
  'MONGO_DB_USER',
  'MONGO_DB_PASSWORD',
  'MONGO_AUTH_SOURCE',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const buildMongoUrl = () => {
  const {
    MONGO_HOST,
    MONGO_PORT,
    MONGO_DB_NAME,
    MONGO_DB_USER,
    MONGO_DB_PASSWORD,
    MONGO_AUTH_SOURCE,
  } = process.env;

  return `mongodb://${MONGO_DB_USER}:${MONGO_DB_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}?authSource=${MONGO_AUTH_SOURCE}`;
};

export const getApiConfig = () => {
  for (const key of EXPECTED_ENV_KEYS) {
    if (!process.env[key]) {
      console.warn(`[config] ${key} is not set.`);
    }
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT);
  const nodeEnv = process.env.NODE_ENV;

  return {
    NODE_ENV: nodeEnv,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PORT: Number(process.env.PORT),
    FRONTEND_URL: process.env.FRONTEND_URL,
    SECRET: process.env.SECRET || '',
    MONGO_HOST: process.env.MONGO_HOST,
    MONGO_PORT: process.env.MONGO_PORT,
    MONGO_URI: buildMongoUrl(),
    MONGO_DB_NAME: process.env.MONGO_DB_NAME,
    IS_PRODUCTION: nodeEnv === 'production',
    SMTP: {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      from: process.env.SMTP_FROM,
    },
  };
};
