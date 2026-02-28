import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import { ingestDocument } from '../ingestion/pipeline.js';
import { query } from '../db/index.js';
import { findAuditEntries } from '../db/queries/audit.js';
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

// Audit log — query audit entries with actor/target name joins
router.get('/api/admin/audit', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const actorId = req.query.actor_id as string | undefined;
  const targetStudentId = req.query.target_student_id as string | undefined;
  const action = req.query.action as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  // Build query with joins for actor and target names
  const conditions = ['al.board_id = $1'];
  const params: unknown[] = [req.user!.boardId];
  let idx = 2;

  if (actorId) {
    conditions.push(`al.actor_id = $${idx++}`);
    params.push(actorId);
  }
  if (targetStudentId) {
    conditions.push(`al.target_student_id = $${idx++}`);
    params.push(targetStudentId);
  }
  if (action) {
    conditions.push(`al.action = $${idx++}`);
    params.push(action);
  }

  const whereClause = conditions.join(' AND ');

  const [entriesResult, countResult] = await Promise.all([
    query<{
      id: string;
      board_id: string;
      actor_id: string;
      action: string;
      target_student_id: string | null;
      details: Record<string, unknown>;
      ip_address: string | null;
      session_id: string | null;
      created_at: Date;
      actor_name: string | null;
      target_name: string | null;
    }>(
      `SELECT al.*,
         CONCAT(actor.name_first, ' ', actor.name_last) as actor_name,
         CASE WHEN target.id IS NOT NULL
           THEN CONCAT(target.name_first, ' ', target.name_last)
           ELSE NULL
         END as target_name
       FROM audit_log al
       LEFT JOIN users actor ON actor.id = al.actor_id
       LEFT JOIN users target ON target.id = al.target_student_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    ),
    query<{ total: string }>(
      `SELECT count(*)::text as total FROM audit_log al WHERE ${whereClause}`,
      params
    ),
  ]);

  res.json({
    entries: entriesResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  });
});

// Dashboard — board-wide statistics
router.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const boardId = req.user!.boardId;

  const [
    userCounts,
    contentCounts,
    sessionCounts,
    consentCounts,
    recentActivity,
  ] = await Promise.all([
    // User role counts
    query<{ role: string; count: string }>(
      `SELECT role, count(*)::text as count
       FROM users WHERE board_id = $1
       GROUP BY role`,
      [boardId]
    ),

    // Document, chunk, embedding counts
    query<{ documents: number; chunks: number; embeddings: number }>(
      `SELECT
         (SELECT count(*) FROM documents WHERE board_id = $1)::int as documents,
         (SELECT count(*) FROM chunks WHERE board_id = $1)::int as chunks,
         (SELECT count(*) FROM embeddings WHERE board_id = $1)::int as embeddings`,
      [boardId]
    ),

    // Session and message counts
    query<{ sessions: number; messages: number }>(
      `SELECT
         (SELECT count(*) FROM chat_sessions WHERE board_id = $1)::int as sessions,
         (SELECT count(*) FROM chat_messages cm
          JOIN chat_sessions cs ON cs.id = cm.session_id
          WHERE cs.board_id = $1)::int as messages`,
      [boardId]
    ),

    // Consent stats
    query<{ status: string; count: string }>(
      `SELECT status::text, count(*)::text as count
       FROM consent_records WHERE board_id = $1
       GROUP BY status`,
      [boardId]
    ),

    // Recent audit activity
    query<{
      id: string;
      actor_id: string;
      action: string;
      target_student_id: string | null;
      created_at: Date;
      actor_name: string | null;
      target_name: string | null;
    }>(
      `SELECT al.id, al.actor_id, al.action, al.target_student_id, al.created_at,
         CONCAT(actor.name_first, ' ', actor.name_last) as actor_name,
         CASE WHEN target.id IS NOT NULL
           THEN CONCAT(target.name_first, ' ', target.name_last)
           ELSE NULL
         END as target_name
       FROM audit_log al
       LEFT JOIN users actor ON actor.id = al.actor_id
       LEFT JOIN users target ON target.id = al.target_student_id
       WHERE al.board_id = $1
       ORDER BY al.created_at DESC
       LIMIT 10`,
      [boardId]
    ),
  ]);

  // Build role counts map
  const roleCounts: Record<string, number> = {};
  let totalStudents = 0;
  let totalStaff = 0;
  let totalUsers = 0;
  const staffRoles = [
    'teacher', 'educational_assistant', 'guidance_counsellor',
    'vice_principal', 'principal', 'board_admin', 'supply_teacher',
  ];

  for (const row of userCounts.rows) {
    const count = parseInt(row.count, 10);
    roleCounts[row.role] = count;
    totalUsers += count;
    if (row.role === 'student') totalStudents = count;
    if (staffRoles.includes(row.role)) totalStaff += count;
  }

  // Build consent stats
  const consentStats: Record<string, number> = {
    granted: 0, pending: 0, denied: 0, revoked: 0,
  };
  for (const row of consentCounts.rows) {
    consentStats[row.status] = parseInt(row.count, 10);
  }

  res.json({
    stats: {
      total_users: totalUsers,
      total_students: totalStudents,
      total_staff: totalStaff,
      role_counts: roleCounts,
      total_documents: contentCounts.rows[0].documents,
      total_chunks: contentCounts.rows[0].chunks,
      total_embeddings: contentCounts.rows[0].embeddings,
      total_sessions: sessionCounts.rows[0].sessions,
      total_messages: sessionCounts.rows[0].messages,
      consent_stats: consentStats,
      recent_activity: recentActivity.rows,
    },
  });
});

// Users list — paginated user list with filtering
router.get('/api/admin/users', authMiddleware, async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = ['board_id = $1'];
  const params: unknown[] = [req.user!.boardId];
  let idx = 2;

  if (role) {
    conditions.push(`role = $${idx++}`);
    params.push(role);
  }
  if (search) {
    conditions.push(
      `(name_first ILIKE $${idx} OR name_last ILIKE $${idx} OR email ILIKE $${idx})`
    );
    params.push(`%${search}%`);
    idx++;
  }

  const whereClause = conditions.join(' AND ');

  const [usersResult, countResult] = await Promise.all([
    query<{
      id: string;
      email: string | null;
      name_first: string;
      name_last: string;
      role: string;
      active: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, name_first, name_last, role, active, created_at
       FROM users
       WHERE ${whereClause}
       ORDER BY name_last, name_first
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    ),
    query<{ total: string }>(
      `SELECT count(*)::text as total FROM users WHERE ${whereClause}`,
      params
    ),
  ]);

  res.json({
    users: usersResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  });
});

export default router;
