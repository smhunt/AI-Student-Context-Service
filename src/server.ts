import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { healthRouter, authRouter, adminRouter, webhooksRouter, chatRouter } from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(authRouter);
app.use(adminRouter);
app.use(webhooksRouter);
app.use(chatRouter);

app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  StudentContext AI API                       ║
  ║  Port: ${config.port}                                ║
  ║  Env:  ${config.nodeEnv.padEnd(37)}║
  ║  CORS: ${config.corsOrigin.padEnd(37)}║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
