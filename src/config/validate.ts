import { config } from './index.js';

/**
 * Validate required environment variables at startup.
 * Fails fast with clear error messages.
 */
export function validateRequiredEnv(): void {
  const errors: string[] = [];

  // Database is always required
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Auth provider validation
  switch (config.authProvider) {
    case 'clerk':
      if (!config.clerkSecretKey) errors.push('CLERK_SECRET_KEY is required when AUTH_PROVIDER=clerk');
      if (!config.clerkPublishableKey) errors.push('CLERK_PUBLISHABLE_KEY is required when AUTH_PROVIDER=clerk');
      break;
    case 'entra':
      if (!config.entraTenantId) errors.push('ENTRA_TENANT_ID is required when AUTH_PROVIDER=entra');
      if (!config.entraClientId) errors.push('ENTRA_CLIENT_ID is required when AUTH_PROVIDER=entra');
      break;
    case 'google':
      if (!config.googleAuthClientId) errors.push('GOOGLE_AUTH_CLIENT_ID is required when AUTH_PROVIDER=google');
      break;
  }

  // LLM provider validation
  switch (config.llmProvider) {
    case 'claude':
      if (!config.claudeApiKey) errors.push('CLAUDE_API_KEY is required when LLM_PROVIDER=claude');
      break;
    case 'openai':
      if (!config.openaiChatApiKey) errors.push('OPENAI_CHAT_API_KEY or OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      break;
    case 'gemini':
      if (!config.geminiApiKey) errors.push('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
      break;
    case 'llama':
      if (!config.groqApiKey) errors.push('GROQ_API_KEY is required when LLM_PROVIDER=llama');
      break;
    case 'mistral':
      if (!config.mistralApiKey) errors.push('MISTRAL_API_KEY is required when LLM_PROVIDER=mistral');
      break;
  }

  // SIS provider validation
  if (config.sisProvider === 'aspen') {
    if (!config.aspenBaseUrl) errors.push('ASPEN_BASE_URL is required when SIS_PROVIDER=aspen');
    if (!config.aspenClientId) errors.push('ASPEN_CLIENT_ID is required when SIS_PROVIDER=aspen');
    if (!config.aspenClientSecret) errors.push('ASPEN_CLIENT_SECRET is required when SIS_PROVIDER=aspen');
  }

  if (config.sisProtocol === 'oneroster') {
    if (!config.onerosterBaseUrl) errors.push('ONEROSTER_BASE_URL is required when SIS_PROTOCOL=oneroster');
    if (!config.onerosterClientId) errors.push('ONEROSTER_CLIENT_ID is required when SIS_PROTOCOL=oneroster');
    if (!config.onerosterClientSecret) errors.push('ONEROSTER_CLIENT_SECRET is required when SIS_PROTOCOL=oneroster');
  }

  if (errors.length > 0) {
    console.error('\n  *** ENVIRONMENT VALIDATION FAILED ***\n');
    for (const error of errors) {
      console.error(`    - ${error}`);
    }
    console.error('\n  Fix the above issues and restart.\n');
    process.exit(1);
  }
}
