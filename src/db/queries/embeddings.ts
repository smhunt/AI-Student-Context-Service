import { query } from '../index.js';
import type { Embedding, SensitivityLevel } from '../../types/index.js';

export async function createEmbedding(embedding: {
  chunk_id: string;
  student_id: string;
  board_id: string;
  embedding: number[];
  model: string;
  sensitivity: SensitivityLevel;
}): Promise<Embedding> {
  const vectorStr = `[${embedding.embedding.join(',')}]`;
  const result = await query<Embedding>(
    `INSERT INTO embeddings (chunk_id, student_id, board_id, embedding, model, sensitivity)
     VALUES ($1, $2, $3, $4::vector, $5, $6)
     RETURNING id, chunk_id, student_id, board_id, model, sensitivity, created_at`,
    [
      embedding.chunk_id,
      embedding.student_id,
      embedding.board_id,
      vectorStr,
      embedding.model,
      embedding.sensitivity,
    ]
  );
  return result.rows[0];
}

export interface SimilarChunkResult {
  chunk_id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  sensitivity: SensitivityLevel;
  distance: number;
  document_title: string | null;
  document_source: string;
}

export async function searchSimilar(
  queryVector: number[],
  studentId: string,
  opts?: {
    maxSensitivity?: SensitivityLevel;
    limit?: number;
    threshold?: number;
  }
): Promise<SimilarChunkResult[]> {
  const limit = opts?.limit ?? 5;
  const threshold = opts?.threshold ?? 0.8; // cosine distance threshold
  const vectorStr = `[${queryVector.join(',')}]`;

  // Build sensitivity filter
  const sensitivityLevels: SensitivityLevel[] = ['standard'];
  if (opts?.maxSensitivity === 'sensitive') sensitivityLevels.push('sensitive');
  if (opts?.maxSensitivity === 'restricted') sensitivityLevels.push('sensitive', 'restricted');

  const result = await query<SimilarChunkResult>(
    `SELECT
       e.chunk_id,
       c.document_id,
       c.content,
       c.chunk_index,
       c.token_count,
       c.sensitivity,
       (e.embedding <=> $1::vector) as distance,
       d.title as document_title,
       d.source as document_source
     FROM embeddings e
     JOIN chunks c ON c.id = e.chunk_id
     JOIN documents d ON d.id = c.document_id
     WHERE e.student_id = $2
       AND e.sensitivity = ANY($3::sensitivity_level[])
       AND (e.embedding <=> $1::vector) < $4
     ORDER BY e.embedding <=> $1::vector
     LIMIT $5`,
    [vectorStr, studentId, sensitivityLevels, threshold, limit]
  );
  return result.rows;
}
