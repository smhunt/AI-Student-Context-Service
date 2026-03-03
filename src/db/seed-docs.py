#!/usr/bin/env python3
"""
Insert 20 seed documents for Alex Johnson directly via psql.
Run: python3 src/db/seed-docs.py
"""
import hashlib
import json
import os
import subprocess
import sys

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://sc_dev:dev_password@localhost:5438/studentcontext')
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, 'seed-documents.json')


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

    # Build SQL
    lines = []
    lines.append("BEGIN;")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")
    lines.append("  v_sid UUID;")
    lines.append("  v_bid UUID;")
    lines.append("  v_did UUID;")
    lines.append("BEGIN")
    lines.append("  SELECT u.id, u.board_id INTO v_sid, v_bid")
    lines.append("  FROM users u WHERE u.email = 'alex.johnson@tvdsb.on.ca';")
    lines.append("  IF v_sid IS NULL THEN")
    lines.append("    RAISE EXCEPTION 'Alex Johnson not found. Run npm run db:seed first.';")
    lines.append("  END IF;")
    lines.append(f"  RAISE NOTICE 'Inserting {len(docs)} documents for student %', v_sid;")
    lines.append("")

    for doc in docs:
        content_hash = hashlib.sha256(doc['content'].encode()).hexdigest()
        chunks = split_into_chunks(doc['content'])
        meta_json = json.dumps(doc['metadata'])

        lines.append(f"  -- {doc['title']}")
        lines.append(f"  IF NOT EXISTS (SELECT 1 FROM documents WHERE hash = '{content_hash}') THEN")
        lines.append(f"    INSERT INTO documents (student_id, board_id, source, title, content, academic_year, sensitivity, metadata, hash)")
        lines.append(f"    VALUES (v_sid, v_bid, '{doc['source']}', '{esc(doc['title'])}', '{esc(doc['content'])}', '2025-2026', '{doc['sensitivity']}', '{esc(meta_json)}', '{content_hash}')")
        lines.append(f"    RETURNING id INTO v_did;")

        for i, chunk in enumerate(chunks):
            lines.append(f"    INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)")
            lines.append(f"    VALUES (v_did, v_sid, v_bid, '{esc(chunk['text'])}', {i}, {chunk['tokenCount']}, '{doc['sensitivity']}', '{{}}');")

        lines.append(f"    RAISE NOTICE '  [ok] {esc(doc['title'])} — {len(chunks)} chunks';")
        lines.append(f"  ELSE")
        lines.append(f"    RAISE NOTICE '  [skip] {esc(doc['title'])} (duplicate)';")
        lines.append(f"  END IF;")
        lines.append("")

    lines.append("END $$;")
    lines.append("")
    lines.append("COMMIT;")

    sql = '\n'.join(lines)

    # Run via psql
    result = subprocess.run(
        ['psql', DB_URL, '-v', 'ON_ERROR_STOP=1'],
        input=sql, capture_output=True, text=True
    )

    # Print notices (document status)
    for line in result.stderr.split('\n'):
        if 'NOTICE' in line:
            msg = line.split('NOTICE:')[-1].strip() if 'NOTICE:' in line else line
            print(msg)

    if result.returncode != 0:
        err = result.stderr
        if 'ERROR' in err:
            for line in err.split('\n'):
                if 'ERROR' in line:
                    print(f"Error: {line}", file=sys.stderr)
        sys.exit(1)

    print("\nDone.")


if __name__ == '__main__':
    main()
