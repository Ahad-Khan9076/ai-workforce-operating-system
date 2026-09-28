export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  api: {
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    defaultVersion: process.env.API_DEFAULT_VERSION ?? '1',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'development-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  ai: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    provider: process.env.AI_PROVIDER ?? 'auto',
    defaultModel: process.env.AI_DEFAULT_MODEL ?? 'gpt-4o-mini',
  },
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  auth: {
    refreshCookieName: 'refresh_token',
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10),
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '7', 10),
    invitationTtlDays: parseInt(process.env.INVITATION_TTL_DAYS ?? '7', 10),
  },
});
