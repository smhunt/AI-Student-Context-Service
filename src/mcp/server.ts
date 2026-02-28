import { z } from 'zod/v4';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleSearchContext } from './tools/search-context.js';
import { handleGetPermissions } from './tools/get-permissions.js';
import { handleCheckConsent } from './tools/check-consent.js';
import { handleIngestDocument } from './tools/ingest-document.js';
import { readStudentContext } from './resources/student-context.js';
import { readAuditLogs } from './resources/audit-logs.js';
import { readSessions } from './resources/sessions.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'studentcontext-ai',
    version: '0.9.0',
  });

  // --- Tools ---

  server.tool(
    'search_student_context',
    'Search a student\'s academic context using semantic similarity. Returns relevant chunks scoped by role permissions and parental consent.',
    {
      user_id: z.string().describe('Authenticated user ID performing the search'),
      board_id: z.string().describe('Board ID for multi-tenant scoping'),
      student_id: z.string().describe('Target student ID to search context for'),
      query: z.string().describe('Natural language query to search against student records'),
      max_results: z.number().int().min(1).max(20).optional().describe('Maximum chunks to return (default: 5)'),
    },
    async (args) => handleSearchContext(args),
  );

  server.tool(
    'get_permission_scope',
    'Get the permission scope for a user — which students they can access, maximum sensitivity level, and allowed data sources.',
    {
      user_id: z.string().describe('User ID to resolve permissions for'),
      board_id: z.string().describe('Board ID for multi-tenant scoping'),
    },
    async (args) => handleGetPermissions(args),
  );

  server.tool(
    'check_consent',
    'Check if a student has active parental consent for AI context retrieval.',
    {
      student_id: z.string().describe('Student ID to check consent for'),
      consent_type: z.string().optional().describe('Type of consent (default: ai_context)'),
    },
    async (args) => handleCheckConsent(args),
  );

  server.tool(
    'ingest_document',
    'Ingest a document into the student context system. Handles deduplication, chunking, embedding, and storage.',
    {
      student_id: z.string().describe('Student this document belongs to'),
      board_id: z.string().describe('Board ID for multi-tenant isolation'),
      source: z.string().describe('Document source type (e.g. google_classroom_assignment, sis_report_card)'),
      title: z.string().describe('Document title'),
      content: z.string().min(1).describe('Full text content of the document'),
      sensitivity: z.enum(['standard', 'sensitive', 'restricted']).describe('Sensitivity level'),
      academic_year: z.string().optional().describe('Academic year (e.g. 2025-2026)'),
      course_id: z.string().optional().describe('Optional course ID'),
    },
    async (args) => handleIngestDocument(args),
  );

  // --- Resources ---

  server.resource(
    'student-context',
    new ResourceTemplate('studentcontext://students/{id}/context', {
      list: undefined,
    }),
    async (uri, { id }) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: await readStudentContext(id as string),
      }],
    }),
  );

  server.resource(
    'audit-logs',
    new ResourceTemplate('studentcontext://audit/{board_id}', {
      list: undefined,
    }),
    async (uri, { board_id }) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: await readAuditLogs(board_id as string),
      }],
    }),
  );

  server.resource(
    'sessions',
    new ResourceTemplate('studentcontext://sessions/{user_id}', {
      list: undefined,
    }),
    async (uri, { user_id }) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: await readSessions(user_id as string, ''),
      }],
    }),
  );

  return server;
}
