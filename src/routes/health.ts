import { Router } from 'express';
import { pool } from '../db/index.js';
import { config } from '../config/index.js';

const router = Router();

// Basic health check
router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Detailed health check with component status
router.get('/health/detailed', async (_req, res) => {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Database
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'unhealthy', error: (err as Error).message };
  }

  // Embedding service (check if OpenAI key is configured)
  checks.embeddings = config.openaiApiKey
    ? { status: 'configured' }
    : { status: 'unconfigured', error: 'OPENAI_API_KEY not set' };

  // LLM providers
  const providers: Record<string, boolean> = {
    claude: !!config.claudeApiKey,
    openai: !!config.openaiChatApiKey,
    gemini: !!config.geminiApiKey,
    groq: !!config.groqApiKey,
    mistral: !!config.mistralApiKey,
  };
  const configuredProviders = Object.entries(providers).filter(([, v]) => v).map(([k]) => k);
  checks.llm_providers = {
    status: configuredProviders.length > 0 ? 'configured' : 'unconfigured',
    ...(configuredProviders.length > 0 ? {} : { error: 'No LLM provider API key set' }),
  };

  // SIS provider
  checks.sis = {
    status: config.sisProvider === 'mock' ? 'mock' : 'configured',
  };

  // Auth provider
  checks.auth = {
    status: config.authProvider === 'dev' ? 'dev' : 'configured',
  };

  // MCP HTTP
  checks.mcp_http = {
    status: config.mcpHttpEnabled ? 'enabled' : 'disabled',
  };

  // Overall status
  const isHealthy = checks.database.status === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    checks,
    providers: {
      active: config.llmProvider,
      configured: configuredProviders,
    },
  });
});

export default router;
