import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { createMcpServer } from './server.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { mcpAuthMiddleware } from './middleware/mcp-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * MCP HTTP/SSE Server — standalone HTTP service for the context engine.
 *
 * Exposes the MCP protocol over HTTP with SSE transport, allowing any system
 * (not just Claude Desktop) to use the context engine tools.
 *
 * Auth: Bearer token middleware using the configured AuthProvider.
 * Transport: Server-Sent Events (SSE) for the MCP protocol.
 */
export function startMcpHttpServer(): void {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'mcp-http', version: '1.0.0' });
  });

  // Active transports keyed by session ID
  const transports = new Map<string, SSEServerTransport>();

  // SSE endpoint — establishes the SSE connection
  app.get('/sse', mcpAuthMiddleware, async (req, res) => {
    const mcpServer = createMcpServer();
    const transport = new SSEServerTransport('/messages', res);

    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    // Clean up on disconnect
    res.on('close', () => {
      transports.delete(sessionId);
    });

    await mcpServer.connect(transport);
  });

  // Message endpoint — receives JSON-RPC messages from the client
  app.post('/messages', mcpAuthMiddleware, async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Missing sessionId query parameter' },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Session not found. Reconnect via /sse' },
        id: null,
      });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // Start HTTPS server
  const certsDir = path.resolve(__dirname, '..', '..', '..', '.shared-certs');
  const sslOpts = {
    key: fs.readFileSync(path.join(certsDir, 'key.pem')),
    cert: fs.readFileSync(path.join(certsDir, 'cert.pem')),
  };

  const port = config.mcpHttpPort;
  https.createServer(sslOpts, app).listen(port, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║  MCP HTTP/SSE Server (HTTPS)                ║
  ║  Port: ${String(port).padEnd(37)}║
  ║  SSE:  /sse                                 ║
  ║  Messages: /messages?sessionId=...          ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}

// Allow running as standalone
if (process.argv[1]?.endsWith('http-server.ts') || process.argv[1]?.endsWith('http-server.js')) {
  startMcpHttpServer();
}
