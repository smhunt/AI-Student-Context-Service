import { z } from 'zod/v4';
import { searchSimilar } from '../../db/queries/embeddings.js';
import { resolvePermissionScope } from '../../services/permissions.js';
import { verifyConsent } from '../../services/consent.js';
import { generateEmbedding } from '../../services/embedder.js';
import { logContextRetrieval } from '../../services/audit.js';

export const searchContextSchema = {
  name: 'search_student_context',
  description:
    'Search a student\'s academic context using semantic similarity. Returns relevant chunks from their documents (assignments, grades, report cards, etc.) scoped by the caller\'s role permissions and parental consent.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      user_id: { type: 'string', description: 'Authenticated user ID performing the search' },
      board_id: { type: 'string', description: 'Board ID for multi-tenant scoping' },
      student_id: { type: 'string', description: 'Target student ID to search context for' },
      query: { type: 'string', description: 'Natural language query to search against student records' },
      max_results: { type: 'number', description: 'Maximum chunks to return (default: 5)' },
    },
    required: ['user_id', 'board_id', 'student_id', 'query'],
  },
};

const inputValidator = z.object({
  user_id: z.string().uuid(),
  board_id: z.string().uuid(),
  student_id: z.string().uuid(),
  query: z.string().min(1),
  max_results: z.number().int().min(1).max(20).optional(),
});

export async function handleSearchContext(args: Record<string, unknown>) {
  const parsed = inputValidator.parse(args);

  // 1. Check permissions
  const scope = await resolvePermissionScope(parsed.user_id, parsed.board_id);
  if (!scope.studentIds.includes(parsed.student_id)) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Permission denied: student not in scope' }) }],
      isError: true,
    };
  }

  // 2. Check consent
  const consent = await verifyConsent(parsed.student_id, scope.dataSources);
  if (!consent.allowed) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No active parental consent for this student' }) }],
      isError: true,
    };
  }

  // 3. Embed query and search
  const queryVector = await generateEmbedding(parsed.query);
  const results = await searchSimilar(queryVector, parsed.student_id, {
    maxSensitivity: scope.sensitivityMax,
    limit: parsed.max_results ?? 5,
    sources: consent.filteredSources,
  });

  // 4. Audit
  if (results.length > 0) {
    await logContextRetrieval({
      boardId: parsed.board_id,
      actorId: parsed.user_id,
      targetStudentId: parsed.student_id,
      query: parsed.query,
      chunksRetrieved: results.map((r) => r.chunk_id),
      chunkCount: results.length,
      sessionId: undefined,
      ipAddress: 'mcp',
    });
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        student_id: parsed.student_id,
        chunks: results.map((r) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          source: r.document_source,
          title: r.document_title,
          similarity: r.distance,
        })),
        total: results.length,
      }),
    }],
  };
}
