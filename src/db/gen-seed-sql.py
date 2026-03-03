#!/usr/bin/env python3
"""
Generate SQL file to insert seed documents for Alex Johnson.
Step 1: python3 src/db/gen-seed-sql.py
Step 2: psql $DATABASE_URL -f /tmp/seed-docs.sql
"""
import hashlib
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, 'seed-documents.json')
OUT_PATH = '/tmp/seed-docs.sql'


def esc(s):
    return s.replace("'", "''")


def split_into_chunks(text, chunk_size=500, overlap=50):
    trimmed = text.strip()
    if not trimmed:
        return []
    est_tokens = len(trimmed) // 4 + 1
    if est_tokens <= chunk_size:
        return [{'text': trimmed, 'tokenCount': est_tokens}]

    chunk_chars = chunk_size * 4
    overlap_chars = overlap * 4
    chunks = []
    start = 0
    while start < len(trimmed):
        end = min(start + chunk_chars, len(trimmed))
        if end < len(trimmed):
            search_start = max(end - 200, start + 1)
            last_space = trimmed.rfind(' ', search_start, end)
            last_newline = trimmed.rfind('\n', search_start, end)
            bp = max(last_space, last_newline)
            if bp > search_start:
                end = bp + 1
        ct = trimmed[start:end].strip()
        if ct:
            chunks.append({'text': ct, 'tokenCount': len(ct) // 4 + 1})
        if end >= len(trimmed):
            break
        new_start = end - overlap_chars
        if new_start <= start:
            new_start = end
        start = new_start
    return chunks


def main():
    with open(JSON_PATH) as f:
        docs = json.load(f)

    with open(OUT_PATH, 'w') as out:
        out.write("BEGIN;\n\n")
        out.write("DO $$\n")
        out.write("DECLARE\n")
        out.write("  v_sid UUID;\n")
        out.write("  v_bid UUID;\n")
        out.write("  v_did UUID;\n")
        out.write("BEGIN\n")
        out.write("  SELECT u.id, u.board_id INTO v_sid, v_bid\n")
        out.write("  FROM users u WHERE u.email = 'alex.johnson@tvdsb.on.ca';\n")
        out.write("  IF v_sid IS NULL THEN\n")
        out.write("    RAISE EXCEPTION 'Alex Johnson not found. Run npm run db:seed first.';\n")
        out.write("  END IF;\n")
        out.write("  RAISE NOTICE 'Inserting %s documents for student %%', v_sid;\n\n" % len(docs))

        total_chunks = 0
        for doc in docs:
            content_hash = hashlib.sha256(doc['content'].encode()).hexdigest()
            chunks = split_into_chunks(doc['content'])
            meta_json = json.dumps(doc['metadata'])
            total_chunks += len(chunks)

            out.write("  -- %s\n" % doc['title'])
            out.write("  IF NOT EXISTS (SELECT 1 FROM documents WHERE hash = '%s') THEN\n" % content_hash)
            out.write("    INSERT INTO documents (student_id, board_id, source, title, content, academic_year, sensitivity, metadata, hash)\n")
            out.write("    VALUES (v_sid, v_bid, '%s', '%s', '%s', '2025-2026', '%s', '%s', '%s')\n" % (
                doc['source'], esc(doc['title']), esc(doc['content']),
                doc['sensitivity'], esc(meta_json), content_hash
            ))
            out.write("    RETURNING id INTO v_did;\n")

            for i, chunk in enumerate(chunks):
                out.write("    INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)\n")
                out.write("    VALUES (v_did, v_sid, v_bid, '%s', %d, %d, '%s', '{}');\n" % (
                    esc(chunk['text']), i, chunk['tokenCount'], doc['sensitivity']
                ))

            out.write("    RAISE NOTICE '  [ok] %s -- %d chunks';\n" % (esc(doc['title']), len(chunks)))
            out.write("  ELSE\n")
            out.write("    RAISE NOTICE '  [skip] %s (duplicate)';\n" % esc(doc['title']))
            out.write("  END IF;\n\n")

        out.write("END $$;\n\n")
        out.write("COMMIT;\n")

    size = os.path.getsize(OUT_PATH)
    print("Generated %s (%d bytes)" % (OUT_PATH, size))
    print("%d documents, %d chunks total" % (len(docs), total_chunks))


if __name__ == '__main__':
    main()
