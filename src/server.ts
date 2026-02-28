import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { healthRouter, authRouter, adminRouter, webhooksRouter, chatRouter, staffRouter, consentRouter } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(authRouter);
app.use(adminRouter);
app.use(webhooksRouter);
app.use(chatRouter);
app.use(staffRouter);
app.use(consentRouter);

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
});

export default app;
