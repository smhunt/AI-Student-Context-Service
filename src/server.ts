import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { validateRequiredEnv } from './config/validate.js';
import { healthRouter, authRouter, adminRouter, webhooksRouter, chatRouter, staffRouter, consentRouter, openaiCompatRouter } from './routes/index.js';
import { chatRateLimit, adminRateLimit, openaiCompatRateLimit } from './middleware/rate-limit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fail-fast: validate required env vars
validateRequiredEnv();

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Routes with rate limiting
app.use(healthRouter);
app.use(authRouter);
app.use('/api/admin', adminRateLimit);
app.use(adminRouter);
app.use(webhooksRouter);
app.use('/api/chat', chatRateLimit);
app.use(chatRouter);
app.use(staffRouter);
app.use(consentRouter);
app.use('/v1', openaiCompatRateLimit);
app.use(openaiCompatRouter);

const certsDir = path.resolve(__dirname, '..', '..', '.shared-certs');
const sslOpts = {
  key: fs.readFileSync(path.join(certsDir, 'key.pem')),
  cert: fs.readFileSync(path.join(certsDir, 'cert.pem')),
};

https.createServer(sslOpts, app).listen(config.port, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  StudentContext AI API (HTTPS)               ║
  ║  Port: ${config.port}                                ║
  ║  Env:  ${config.nodeEnv.padEnd(37)}║
  ║  CORS: ${config.corsOrigin.padEnd(37)}║
  ╚══════════════════════════════════════════════╝
  `);

  // Start MCP HTTP server if enabled
  if (config.mcpHttpEnabled) {
    import('./mcp/http-server.js').then(({ startMcpHttpServer }) => {
      startMcpHttpServer();
    }).catch((err) => {
      console.error('Failed to start MCP HTTP server:', err);
    });
  }
});

export default app;
