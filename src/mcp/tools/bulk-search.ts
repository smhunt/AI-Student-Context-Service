import { resolvePermissionScope } from '../../services/permissions.js';
import { verifyConsent } from '../../services/consent.js';
import { generateEmbedding } from '../../services/embedder.js';
import { searchSimilar } from '../../db/queries/embeddings.js';

interface BulkSearchArgs {
  user_id: string;
  board_id: string;
  query: string;
  max_students?: number;
  max_chunks_per_student?: number;
}

/**
 * bulk_search — Search across all students in the caller's permission scope.
 *
 * Useful for staff aggregation use cases (class-wide insights, trending topics).
 * Results are scoped by the caller's role permissions and consent status.
 */
export async function handleBulkSearch(args: BulkSearchArgs) {
  try {
    const scope = await resolvePermissionScope(args.user_id, args.board_id);

    if (scope.studentIds.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ results: [], message: 'No students in permission scope' }),
        }],
      };
    }

    const queryVector = await generateEmbedding(args.query);
    const maxStudents = Math.min(args.max_students ?? 20, 50);
    const maxChunks = Math.min(args.max_chunks_per_student ?? 3, 10);

    // Search across students in scope (limited to avoid excessive DB queries)
    const studentIds = scope.studentIds.slice(0, maxStudents);
    const results: {
      student_id: string;
      chunks: { content: string; source: string; similarity: number }[];
    }[] = [];

    for (const studentId of studentIds) {
      const consent = await verifyConsent(studentId, scope.dataSources);
      if (!consent.allowed) continue;

      const searchResults = await searchSimilar(queryVector, studentId, {
        maxSensitivity: scope.sensitivityMax,
        limit: maxChunks,
        sources: consent.filteredSources,
      });

      if (searchResults.length > 0) {
        results.push({
          student_id: studentId,
          chunks: searchResults.map((r) => ({
            content: r.content,
            source: r.document_source,
            similarity: 1 - r.distance, // cosine distance → similarity
          })),
        });
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          query: args.query,
          students_searched: studentIds.length,
          students_with_results: results.length,
          results,
        }, null, 2),
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: ${(err as Error).message}`,
      }],
      isError: true,
    };
  }
}
