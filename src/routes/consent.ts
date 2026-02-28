import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import {
  findChildrenWithConsent,
  findConsentForStudent,
  grantConsent,
  revokeConsent,
} from '../db/queries/consent.js';
import { query } from '../db/index.js';
import type { UserRole } from '../types/index.js';

const router = Router();

function requireParent(role: string): boolean {
  return role === 'parent';
}

/**
 * Verify that a parent has access to a given student.
 * Parents are linked to students via consent_records (parent_id).
 */
async function verifyParentAccess(
  parentId: string,
  studentId: string,
  boardId: string
): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT count(*)::text as count FROM consent_records
     WHERE parent_id = $1 AND student_id = $2 AND board_id = $3`,
    [parentId, studentId, boardId]
  );
  return parseInt(result.rows[0].count, 10) > 0;
}

// Allowed data sources that parents can consent to
const PARENT_ALLOWED_SOURCES = [
  'google_classroom_assignment',
  'google_classroom_submission',
  'google_classroom_grade',
  'sis_report_card',
  'sis_transcript',
  'assessment_eqao',
  'assessment_board',
] as const;

// GET /api/consent/children — List parent's children with consent status
router.get('/api/consent/children', authMiddleware, async (req, res) => {
  if (!requireParent(req.user!.role)) {
    res.status(403).json({ error: 'Parent access required' });
    return;
  }

  const children = await findChildrenWithConsent(
    req.user!.userId,
    req.user!.boardId
  );

  const result = children.map((child) => ({
    id: child.id,
    name_first: child.name_first,
    name_last: child.name_last,
    email: child.email,
    consent: child.consent_id
      ? {
          status: child.status,
          data_sources: child.data_sources ?? [],
          granted_at: child.granted_at,
          revoked_at: child.revoked_at,
        }
      : null,
  }));

  res.json({ children: result });
});

// GET /api/consent/:studentId — Get consent record for a specific student
router.get('/api/consent/:studentId', authMiddleware, async (req, res) => {
  if (!requireParent(req.user!.role)) {
    res.status(403).json({ error: 'Parent access required' });
    return;
  }

  const studentId = req.params.studentId as string;

  // Verify parent has access to this student
  const hasAccess = await verifyParentAccess(
    req.user!.userId,
    studentId,
    req.user!.boardId
  );

  if (!hasAccess) {
    res.status(403).json({ error: 'You do not have access to this student' });
    return;
  }

  // Get student info
  const studentResult = await query<{ name_first: string; name_last: string }>(
    'SELECT name_first, name_last FROM users WHERE id = $1',
    [studentId]
  );

  if (studentResult.rows.length === 0) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const consent = await findConsentForStudent(studentId, req.user!.userId);

  res.json({
    consent,
    student: {
      name_first: studentResult.rows[0].name_first,
      name_last: studentResult.rows[0].name_last,
    },
  });
});

// POST /api/consent/grant — Parent grants consent
const grantSchema = z.object({
  student_id: z.string().uuid(),
  data_sources: z.array(
    z.enum(PARENT_ALLOWED_SOURCES)
  ).min(1),
});

router.post('/api/consent/grant', authMiddleware, async (req, res) => {
  if (!requireParent(req.user!.role)) {
    res.status(403).json({ error: 'Parent access required' });
    return;
  }

  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { student_id, data_sources } = parsed.data;

  // Verify parent has access to this student
  const hasAccess = await verifyParentAccess(
    req.user!.userId,
    student_id,
    req.user!.boardId
  );

  if (!hasAccess) {
    res.status(403).json({ error: 'You do not have access to this student' });
    return;
  }

  const consent = await grantConsent({
    studentId: student_id,
    parentId: req.user!.userId,
    boardId: req.user!.boardId,
    dataSources: data_sources,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ consent });
});

// POST /api/consent/revoke — Parent revokes consent
const revokeSchema = z.object({
  student_id: z.string().uuid(),
});

router.post('/api/consent/revoke', authMiddleware, async (req, res) => {
  if (!requireParent(req.user!.role)) {
    res.status(403).json({ error: 'Parent access required' });
    return;
  }

  const parsed = revokeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { student_id } = parsed.data;

  // Verify parent has access to this student
  const hasAccess = await verifyParentAccess(
    req.user!.userId,
    student_id,
    req.user!.boardId
  );

  if (!hasAccess) {
    res.status(403).json({ error: 'You do not have access to this student' });
    return;
  }

  const consent = await revokeConsent(student_id, req.user!.userId);

  if (!consent) {
    res.status(404).json({ error: 'No active consent found to revoke' });
    return;
  }

  res.json({ consent });
});

export default router;
