import { query } from '../../db/index.js';

export const studentContextResource = {
  uri: 'studentcontext://students/{id}/context',
  name: 'Student Context Summary',
  description: 'Overview of a student\'s ingested documents, chunks, and embedding coverage.',
  mimeType: 'application/json',
};

export async function readStudentContext(studentId: string) {
  const docs = await query(
    `SELECT source, sensitivity, COUNT(*)::int AS count
     FROM documents WHERE student_id = $1
     GROUP BY source, sensitivity ORDER BY source`,
    [studentId]
  );

  const chunks = await query(
    `SELECT COUNT(*)::int AS total, SUM(token_count)::int AS total_tokens
     FROM chunks WHERE student_id = $1`,
    [studentId]
  );

  const embeddings = await query(
    `SELECT COUNT(*)::int AS total FROM embeddings WHERE student_id = $1`,
    [studentId]
  );

  return JSON.stringify({
    student_id: studentId,
    documents: docs.rows,
    chunks: {
      total: chunks.rows[0]?.total || 0,
      total_tokens: chunks.rows[0]?.total_tokens || 0,
    },
    embeddings: { total: embeddings.rows[0]?.total || 0 },
  });
}
