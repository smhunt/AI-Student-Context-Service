#!/usr/bin/env node
/**
 * Standalone document seeder — inserts 20 documents + chunks for Alex Johnson.
 * Uses pure node:pg to avoid tsx memory overhead.
 * Run: node src/db/seed-docs.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sc_dev:dev_password@localhost:5438/studentcontext';

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// Minimal chunker (same logic as src/ingestion/chunker.ts)
function splitIntoChunks(text, chunkSize = 500, overlap = 50) {
  if (!text || text.trim().length === 0) return [];
  const trimmed = text.trim();
  const estimatedTokens = Math.ceil(trimmed.length / 4);
  if (estimatedTokens <= chunkSize) {
    return [{ text: trimmed, tokenCount: estimatedTokens }];
  }
  const chunkChars = chunkSize * 4;
  const overlapChars = overlap * 4;
  const chunks = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = Math.min(start + chunkChars, trimmed.length);
    if (end < trimmed.length) {
      const searchStart = Math.max(end - 200, start + 1);
      const lastSpace = trimmed.lastIndexOf(' ', end);
      const lastNewline = trimmed.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastSpace, lastNewline);
      if (breakPoint > searchStart) end = breakPoint + 1;
    }
    const chunkText = trimmed.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, tokenCount: Math.ceil(chunkText.length / 4) });
    }
    if (end >= trimmed.length) break;
    start = end - overlapChars;
    if (start <= (chunks.length > 0 ? end - chunkChars : 0)) start = end;
  }
  return chunks;
}

async function main() {
  // Get Alex's ID and board ID
  const userResult = await pool.query(
    `SELECT u.id AS student_id, u.board_id FROM users u WHERE u.email = 'alex.johnson@tvdsb.on.ca'`
  );
  if (userResult.rows.length === 0) {
    console.error('Error: Alex Johnson not found. Run `npm run db:seed` first (it creates users).');
    process.exit(1);
  }
  const { student_id: studentId, board_id: boardId } = userResult.rows[0];
  console.log(`Student: Alex Johnson (${studentId})`);

  // Load documents from JSON
  const jsonPath = path.join(__dirname, 'seed-documents.json');
  const docs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`\nIngesting ${docs.length} documents...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalChunks = 0;
    let duplicates = 0;

    for (const doc of docs) {
      const contentHash = crypto.createHash('sha256').update(doc.content).digest('hex');

      // Check duplicate
      const existing = await client.query('SELECT id FROM documents WHERE hash = $1', [contentHash]);
      if (existing.rows.length > 0) {
        duplicates++;
        console.log(`  [skip] ${doc.title} (duplicate)`);
        continue;
      }

      // Insert document
      const docResult = await client.query(
        `INSERT INTO documents (student_id, board_id, source, title, content, academic_year, sensitivity, metadata, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [studentId, boardId, doc.source, doc.title, doc.content, '2025-2026', doc.sensitivity, JSON.stringify(doc.metadata), contentHash]
      );
      const docId = docResult.rows[0].id;

      // Chunk and insert
      const chunks = splitIntoChunks(doc.content);
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [docId, studentId, boardId, chunks[i].text, i, chunks[i].tokenCount, doc.sensitivity, '{}']
        );
        totalChunks++;
      }

      console.log(`  [ok]   ${doc.title} — ${chunks.length} chunks`);
    }

    await client.query('COMMIT');
    console.log(`\nDone: ${docs.length - duplicates} documents, ${totalChunks} chunks`);
    if (duplicates > 0) console.log(`  (${duplicates} duplicates skipped)`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
