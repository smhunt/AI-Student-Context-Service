#!/usr/bin/env node
/**
 * MCP Server entry point — runs as a separate process using stdio transport.
 *
 * Usage:
 *   npx tsx src/mcp/index.ts
 *
 * Or via npm script:
 *   npm run mcp
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "studentcontext": {
 *         "command": "npx",
 *         "args": ["tsx", "src/mcp/index.ts"],
 *         "cwd": "/path/to/AI-Student-Context-Service"
 *       }
 *     }
 *   }
 */
import dotenv from 'dotenv';
dotenv.config();

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] StudentContext AI server running on stdio');
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
