import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3094', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sc_dev:dev_password@localhost:5438/studentcontext',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-studentcontext-2026',
  corsOrigin: process.env.CORS_ORIGIN || 'https://dev.ecoworks.ca:3009',
  nodeEnv: process.env.NODE_ENV || 'development',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  chatMaxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '2048', 10),
  chatTemperature: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: 'text-embedding-3-small',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://dev.ecoworks.ca:3094/api/auth/google/callback',
} as const;
