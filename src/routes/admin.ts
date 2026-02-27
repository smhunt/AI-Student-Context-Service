import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import { ingestDocument } from '../ingestion/pipeline.js';
import { query } from '../db/index.js';
import type { UserRole } from '../types/index.js';

const router = Router();

const ADMIN_ROLES: UserRole[] = ['board_admin', 'principal', 'vice_principal'];

function requireAdmin(req: Express.Request): boolean {
  return !!req.user && ADMIN_ROLES.includes(req.user.role);
}

// Manual document ingestion — for dev/testing without Google Classroom
const ingestSchema = z.object({
  student_email: z.string().email(),
  source: z.enum([
    'google_classroom_assignment', 'google_classroom_submission', 'google_classroom_grade',
    'google_classroom_comment', 'sis_report_card', 'sis_transcript', 'sis_attendance',
    'sis_iep', 'assessment_eqao', 'assessment_board', 'library_record', 'teacher_note',
    'guidance_note',
  ]),
  title: z.string().optional(),
  content: z.string().min(1),
  sensitivity: z.enum(['standard', 'sensitive', 'restricted']).default('standard'),
  academic_year: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.post('/api/admin/ingest', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { student_email, source, title, content, sensitivity, academic_year, metadata } = parsed.data;

  // Look up student by email within the admin's board
  const studentResult = await query(
    'SELECT id, board_id FROM users WHERE email = $1 AND board_id = $2 AND role = $3',
    [student_email, req.user!.boardId, 'student']
  );

  if (studentResult.rows.length === 0) {
    res.status(404).json({ error: `Student not found: ${student_email}` });
    return;
  }

  const student = studentResult.rows[0];

  try {
    const result = await ingestDocument({
      student_id: student.id,
      board_id: student.board_id,
      source,
      title,
      content,
      sensitivity,
      academic_year,
      metadata,
    });

    res.json(result);
  } catch (err) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: 'Ingestion failed', message: (err as Error).message });
  }
});

// Google Classroom sync trigger — lazy import to avoid loading googleapis at startup
const syncSchema = z.object({
  access_token: z.string().min(1),
  school_id: z.string().uuid(),
});

router.post('/api/admin/sync/trigger', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  try {
    const { syncGoogleClassroom } = await import('../ingestion/google-classroom.js');
    const result = await syncGoogleClassroom({
      accessToken: parsed.data.access_token,
      boardId: req.user!.boardId,
      schoolId: parsed.data.school_id,
    });
    res.json(result);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed', message: (err as Error).message });
  }
});

// Google Classroom OAuth URL — lazy import
router.get('/api/admin/sync/google-auth-url', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const { getAuthUrl } = await import('../ingestion/google-classroom.js');
  const url = getAuthUrl(req.user!.boardId);
  res.json({ url });
});

// Sync status — simple count of documents/chunks/embeddings
router.get('/api/admin/sync/status', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const stats = await query(
    `SELECT
       (SELECT count(*) FROM documents WHERE board_id = $1)::int as documents,
       (SELECT count(*) FROM chunks WHERE board_id = $1)::int as chunks,
       (SELECT count(*) FROM embeddings WHERE board_id = $1)::int as embeddings`,
    [req.user!.boardId]
  );

  res.json(stats.rows[0]);
});

export default router;
