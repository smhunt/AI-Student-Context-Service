import { z } from 'zod/v4';
import { ingestDocument } from '../../ingestion/pipeline.js';

export const ingestDocumentSchema = {
  name: 'ingest_document',
  description:
    'Ingest a document into the student context system. Handles deduplication (SHA-256), chunking (~500 tokens), embedding, and storage. Returns the document ID and chunk count.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      student_id: { type: 'string', description: 'Student this document belongs to' },
      board_id: { type: 'string', description: 'Board ID for multi-tenant isolation' },
      source: {
        type: 'string',
        description: 'Document source type',
        enum: [
          'google_classroom_assignment', 'google_classroom_submission',
          'google_classroom_grade', 'google_classroom_comment',
          'sis_report_card', 'sis_transcript', 'sis_attendance', 'sis_iep',
          'assessment_eqao', 'assessment_board',
          'library_record', 'teacher_note', 'guidance_note',
        ],
      },
      title: { type: 'string', description: 'Document title' },
      content: { type: 'string', description: 'Full text content of the document' },
      sensitivity: {
        type: 'string',
        description: 'Sensitivity level',
        enum: ['standard', 'sensitive', 'restricted'],
      },
      academic_year: { type: 'string', description: 'Academic year (e.g. 2025-2026)' },
      course_id: { type: 'string', description: 'Optional course ID' },
    },
    required: ['student_id', 'board_id', 'source', 'title', 'content', 'sensitivity'],
  },
};

const inputValidator = z.object({
  student_id: z.string().uuid(),
  board_id: z.string().uuid(),
  source: z.string(),
  title: z.string(),
  content: z.string().min(1),
  sensitivity: z.enum(['standard', 'sensitive', 'restricted']),
  academic_year: z.string().optional(),
  course_id: z.string().uuid().optional(),
});

export async function handleIngestDocument(args: Record<string, unknown>) {
  const parsed = inputValidator.parse(args);

  const result = await ingestDocument({
    student_id: parsed.student_id,
    board_id: parsed.board_id,
    source: parsed.source as any,
    title: parsed.title,
    content: parsed.content,
    sensitivity: parsed.sensitivity,
    academic_year: parsed.academic_year,
    course_id: parsed.course_id,
  });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        document_id: result.documentId,
        chunks_created: result.chunksCreated,
        embeddings_created: result.embeddingsCreated,
        duplicate: result.duplicate,
      }),
    }],
  };
}
