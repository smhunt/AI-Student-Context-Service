import { query } from '../index.js';
import type { Document, DocumentSource, SensitivityLevel } from '../../types/index.js';

export async function createDocument(doc: {
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
  hash: string;
}): Promise<Document> {
  const result = await query<Document>(
    `INSERT INTO documents (student_id, board_id, source, source_id, title, content, content_date, academic_year, course_id, sensitivity, metadata, hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      doc.student_id,
      doc.board_id,
      doc.source,
      doc.source_id ?? null,
      doc.title ?? null,
      doc.content,
      doc.content_date ?? null,
      doc.academic_year ?? null,
      doc.course_id ?? null,
      doc.sensitivity,
      JSON.stringify(doc.metadata ?? {}),
      doc.hash,
    ]
  );
  return result.rows[0];
}

export async function findDocumentByHash(hash: string): Promise<Document | null> {
  const result = await query<Document>('SELECT * FROM documents WHERE hash = $1', [hash]);
  return result.rows[0] ?? null;
}

export async function findDocumentsByStudent(studentId: string): Promise<Document[]> {
  const result = await query<Document>(
    'SELECT * FROM documents WHERE student_id = $1 ORDER BY created_at DESC',
    [studentId]
  );
  return result.rows;
}

export async function findDocumentById(id: string): Promise<Document | null> {
  const result = await query<Document>('SELECT * FROM documents WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}
