import { query } from '../index.js';
import type { Chunk, SensitivityLevel } from '../../types/index.js';

export async function createChunk(chunk: {
  document_id: string;
  student_id: string;
  board_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  sensitivity: SensitivityLevel;
  metadata?: Record<string, unknown>;
}): Promise<Chunk> {
  const result = await query<Chunk>(
    `INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      chunk.document_id,
      chunk.student_id,
      chunk.board_id,
      chunk.content,
      chunk.chunk_index,
      chunk.token_count,
      chunk.sensitivity,
      JSON.stringify(chunk.metadata ?? {}),
    ]
  );
  return result.rows[0];
}

export async function findChunksByDocument(documentId: string): Promise<Chunk[]> {
  const result = await query<Chunk>(
    'SELECT * FROM chunks WHERE document_id = $1 ORDER BY chunk_index',
    [documentId]
  );
  return result.rows;
}
