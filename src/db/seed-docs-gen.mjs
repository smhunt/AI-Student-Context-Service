#!/usr/bin/env node
/**
 * Generates a SQL file to insert 20 seed documents for Alex Johnson.
 * Run: node src/db/seed-docs-gen.mjs > /tmp/seed-docs.sql
 * Then: psql $DATABASE_URL -f /tmp/seed-docs.sql
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal chunker (same logic as src/ingestion/chunker.ts)
function splitIntoChunks(text, chunkSize = 500) {
  if (!text || text.trim().length === 0) return [];
  const trimmed = text.trim();
  const estimatedTokens = Math.ceil(trimmed.length / 4);
  if (estimatedTokens <= chunkSize) {
    return [{ text: trimmed, tokenCount: estimatedTokens }];
  }
  const chunkChars = chunkSize * 4;
  const overlapChars = 50 * 4;
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

function escSQL(s) {
  return s.replace(/'/g, "''");
}

const docs = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-documents.json'), 'utf8'));

let sql = `-- Auto-generated seed documents for Alex Johnson
-- Run after db:seed creates users: psql $DATABASE_URL -f <this-file>
BEGIN;

DO $$
DECLARE
  v_student_id UUID;
  v_board_id UUID;
  v_doc_id UUID;
BEGIN
  SELECT u.id, u.board_id INTO v_student_id, v_board_id
  FROM users u WHERE u.email = 'alex.johnson@tvdsb.on.ca';

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Alex Johnson not found. Run npm run db:seed first.';
  END IF;

  RAISE NOTICE 'Inserting documents for student %', v_student_id;

`;

for (const doc of docs) {
  const contentHash = crypto.createHash('sha256').update(doc.content).digest('hex');
  const chunks = splitIntoChunks(doc.content);

  sql += `  -- ${doc.title}\n`;
  sql += `  IF NOT EXISTS (SELECT 1 FROM documents WHERE hash = '${contentHash}') THEN\n`;
  sql += `    INSERT INTO documents (student_id, board_id, source, title, content, academic_year, sensitivity, metadata, hash)\n`;
  sql += `    VALUES (v_student_id, v_board_id, '${doc.source}', '${escSQL(doc.title)}', '${escSQL(doc.content)}', '2025-2026', '${doc.sensitivity}', '${escSQL(JSON.stringify(doc.metadata))}', '${contentHash}')\n`;
  sql += `    RETURNING id INTO v_doc_id;\n\n`;

  for (let i = 0; i < chunks.length; i++) {
    sql += `    INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)\n`;
    sql += `    VALUES (v_doc_id, v_student_id, v_board_id, '${escSQL(chunks[i].text)}', ${i}, ${chunks[i].tokenCount}, '${doc.sensitivity}', '{}');\n`;
  }

  sql += `    RAISE NOTICE '  [ok] ${escSQL(doc.title)} — ${chunks.length} chunks';\n`;
  sql += `  ELSE\n`;
  sql += `    RAISE NOTICE '  [skip] ${escSQL(doc.title)} (duplicate)';\n`;
  sql += `  END IF;\n\n`;
}

sql += `END $$;

COMMIT;
`;

process.stdout.write(sql);
