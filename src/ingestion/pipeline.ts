import crypto from 'node:crypto';
import { transaction } from '../db/index.js';
import type { DocumentSource, SensitivityLevel, Document } from '../types/index.js';
import { splitIntoChunks } from './chunker.js';
import { generateEmbeddings } from '../services/embedder.js';
import { config } from '../config/index.js';

export interface IngestParams {
  student_id: string;
  board_id: string;
  source: DocumentSource;
  source_id?: string;
  title?: string;
  content: string;
  content_date?: Date;
  academic_year?: string;
  course_id?: string;
  sensitivity: SensitivityLevel;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  embeddingsCreated: number;
  duplicate: boolean;
}

/**
 * Ingest a document: hash-dedup → chunk → embed → store.
 * Runs within a single transaction for atomicity.
 */
export async function ingestDocument(params: IngestParams): Promise<IngestResult> {
  const contentHash = crypto
    .createHash('sha256')
    .update(params.content)
    .digest('hex');

  return transaction(async (client) => {
    // 1. Check for duplicate
    const existing = await client.query(
      'SELECT id FROM documents WHERE hash = $1',
      [contentHash]
    );
    if (existing.rows.length > 0) {
      return {
        documentId: existing.rows[0].id,
        chunksCreated: 0,
        embeddingsCreated: 0,
        duplicate: true,
      };
    }

    // 2. Create document
    const docResult = await client.query<Document>(
      `INSERT INTO documents (student_id, board_id, source, source_id, title, content, content_date, academic_year, course_id, sensitivity, metadata, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        params.student_id,
        params.board_id,
        params.source,
        params.source_id ?? null,
        params.title ?? null,
        params.content,
        params.content_date ?? null,
        params.academic_year ?? null,
        params.course_id ?? null,
        params.sensitivity,
        JSON.stringify(params.metadata ?? {}),
        contentHash,
      ]
    );
    const doc = docResult.rows[0];

    // 3. Chunk
    const chunkResults = splitIntoChunks(params.content);

    // 4. Store chunks
    const chunkIds: string[] = [];
    const chunkTexts: string[] = [];
    for (let i = 0; i < chunkResults.length; i++) {
      const chunk = chunkResults[i];
      const chunkRow = await client.query(
        `INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          doc.id,
          params.student_id,
          params.board_id,
          chunk.text,
          i,
          chunk.tokenCount,
          params.sensitivity,
          JSON.stringify({}),
        ]
      );
      chunkIds.push(chunkRow.rows[0].id);
      chunkTexts.push(chunk.text);
    }

    // 5. Embed (skip if no API key)
    let embeddingsCreated = 0;
    if (config.openaiApiKey && chunkTexts.length > 0) {
      const vectors = await generateEmbeddings(chunkTexts);

      for (let i = 0; i < vectors.length; i++) {
        const vectorStr = `[${vectors[i].join(',')}]`;
        await client.query(
          `INSERT INTO embeddings (chunk_id, student_id, board_id, embedding, model, sensitivity)
           VALUES ($1, $2, $3, $4::vector, $5, $6)`,
          [
            chunkIds[i],
            params.student_id,
            params.board_id,
            vectorStr,
            config.embeddingModel,
            params.sensitivity,
          ]
        );
        embeddingsCreated++;
      }
    }

    return {
      documentId: doc.id,
      chunksCreated: chunkIds.length,
      embeddingsCreated,
      duplicate: false,
    };
  });
}
