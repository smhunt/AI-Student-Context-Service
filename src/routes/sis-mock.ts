/**
 * SIS Mock API Routes
 *
 * Simulates what a real Aspen (Follett) / OnSIS API would look like for Ontario
 * school boards. Uses Ontario Education Number (OEN) as the student identifier.
 *
 * All endpoints return realistic JSON structures matching Ontario SIS field formats.
 *
 * These mock routes are mounted without authentication so they can be consumed
 * by the sis-sync service (acting as the board integration layer). In production,
 * these would be replaced by real Aspen/OnSIS API calls with board-level
 * service account credentials.
 */

import { Router } from 'express';
import { z } from 'zod/v4';
import {
  getStudentByOEN,
  getReportCardsByOEN,
  getTranscriptByOEN,
  getAttendanceByOEN,
  getIEPByOEN,
  getEQAOByOEN,
  getRosterByCourseCode,
  getSchoolStudentsByCode,
} from '../sis/mock-data.js';

const router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const oenParamSchema = z.object({
  oen: z.string().regex(/^\d{9}$/, 'OEN must be exactly 9 digits'),
});

const courseCodeParamSchema = z.object({
  courseCode: z.string().min(1).max(10),
});

const schoolCodeParamSchema = z.object({
  schoolCode: z.string().min(1).max(10),
});

const webhookBodySchema = z.object({
  event_type: z.enum([
    'student_updated',
    'grade_posted',
    'attendance_updated',
    'iep_updated',
    'enrollment_changed',
  ]),
  oen: z.string().regex(/^\d{9}$/),
  school_code: z.string(),
  board_code: z.string(),
  timestamp: z.string().datetime().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wrapResponse(data: unknown, meta?: Record<string, unknown>) {
  return {
    success: true,
    data,
    meta: {
      source: 'aspen-mock',
      board_code: '66',
      api_version: '1.0.0',
      generated_at: new Date().toISOString(),
      ...meta,
    },
  };
}

function notFoundResponse(message: string) {
  return {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message,
    },
    meta: {
      source: 'aspen-mock',
      board_code: '66',
      api_version: '1.0.0',
      generated_at: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen — Student demographics
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const student = getStudentByOEN(parsed.data.oen);
  if (!student) {
    res.status(404).json(notFoundResponse(`Student with OEN ${parsed.data.oen} not found`));
    return;
  }

  res.json(wrapResponse(student));
});

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen/report-cards — Report cards (all terms)
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen/report-cards', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const student = getStudentByOEN(parsed.data.oen);
  if (!student) {
    res.status(404).json(notFoundResponse(`Student with OEN ${parsed.data.oen} not found`));
    return;
  }

  const reportCards = getReportCardsByOEN(parsed.data.oen);

  // Optional query filters
  const schoolYear = req.query.school_year as string | undefined;
  const term = req.query.term as string | undefined;

  let filtered = reportCards;
  if (schoolYear) {
    filtered = filtered.filter(rc => rc.school_year === schoolYear);
  }
  if (term) {
    filtered = filtered.filter(rc => rc.term === term);
  }

  res.json(wrapResponse(filtered, { total: filtered.length }));
});

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen/transcript — Ontario Student Transcript
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen/transcript', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const transcript = getTranscriptByOEN(parsed.data.oen);
  if (!transcript) {
    res.status(404).json(notFoundResponse(`Transcript for OEN ${parsed.data.oen} not found`));
    return;
  }

  res.json(wrapResponse(transcript));
});

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen/attendance — Attendance records
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen/attendance', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const attendance = getAttendanceByOEN(parsed.data.oen);
  if (!attendance) {
    res.status(404).json(notFoundResponse(`Attendance record for OEN ${parsed.data.oen} not found`));
    return;
  }

  // Optional date range filter
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  if (from || to) {
    const filtered = { ...attendance };
    filtered.days = attendance.days.filter(d => {
      if (from && d.date < from) return false;
      if (to && d.date > to) return false;
      return true;
    });
    // Recalculate summary for filtered range
    const present = filtered.days.filter(d => d.status === 'present').length;
    const late = filtered.days.filter(d => d.status === 'late').length;
    const excused = filtered.days.filter(d => d.status === 'absent_excused').length;
    const unexcused = filtered.days.filter(d => d.status === 'absent_unexcused').length;
    filtered.summary = {
      total_school_days: filtered.days.length,
      present,
      late,
      absent_excused: excused,
      absent_unexcused: unexcused,
      attendance_rate_percent: filtered.days.length > 0
        ? Math.round(((present + late) / filtered.days.length) * 100)
        : 100,
    };
    res.json(wrapResponse(filtered));
    return;
  }

  res.json(wrapResponse(attendance));
});

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen/iep — Individual Education Plan (if exists)
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen/iep', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const iep = getIEPByOEN(parsed.data.oen);

  // iep can be null (student has no IEP) or undefined (unknown OEN)
  if (iep === undefined) {
    res.status(404).json(notFoundResponse(`Student with OEN ${parsed.data.oen} not found`));
    return;
  }

  if (iep === null) {
    res.json(wrapResponse(null, { has_iep: false }));
    return;
  }

  res.json(wrapResponse(iep, { has_iep: true }));
});

// ---------------------------------------------------------------------------
// GET /api/sis/students/:oen/eqao — EQAO assessment results
// ---------------------------------------------------------------------------

router.get('/api/sis/students/:oen/eqao', (req, res) => {
  const parsed = oenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OEN', message: 'OEN must be exactly 9 digits' } });
    return;
  }

  const eqao = getEQAOByOEN(parsed.data.oen);
  if (!eqao) {
    res.status(404).json(notFoundResponse(`EQAO results for OEN ${parsed.data.oen} not found`));
    return;
  }

  res.json(wrapResponse(eqao, { total_assessments: eqao.results.length }));
});

// ---------------------------------------------------------------------------
// GET /api/sis/courses/:courseCode/roster — Class roster
// ---------------------------------------------------------------------------

router.get('/api/sis/courses/:courseCode/roster', (req, res) => {
  const parsed = courseCodeParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_COURSE_CODE', message: 'Invalid course code format' } });
    return;
  }

  const roster = getRosterByCourseCode(parsed.data.courseCode);
  if (!roster) {
    res.status(404).json(notFoundResponse(`Roster for course ${parsed.data.courseCode} not found`));
    return;
  }

  res.json(wrapResponse(roster, { student_count: roster.students.length }));
});

// ---------------------------------------------------------------------------
// GET /api/sis/schools/:schoolCode/students — School student list
// ---------------------------------------------------------------------------

router.get('/api/sis/schools/:schoolCode/students', (req, res) => {
  const parsed = schoolCodeParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_SCHOOL_CODE', message: 'Invalid school code format' } });
    return;
  }

  const schoolList = getSchoolStudentsByCode(parsed.data.schoolCode);
  if (!schoolList) {
    res.status(404).json(notFoundResponse(`School with code ${parsed.data.schoolCode} not found`));
    return;
  }

  // Optional grade filter
  const grade = req.query.grade ? parseInt(req.query.grade as string, 10) : undefined;
  if (grade !== undefined && !isNaN(grade)) {
    const filtered = {
      ...schoolList,
      students: schoolList.students.filter(s => s.grade === grade),
    };
    filtered.total_students = filtered.students.length;
    res.json(wrapResponse(filtered, { total_students: filtered.total_students }));
    return;
  }

  res.json(wrapResponse(schoolList, { total_students: schoolList.total_students }));
});

// ---------------------------------------------------------------------------
// POST /api/sis/sync/webhook — Simulated SIS change notification
// ---------------------------------------------------------------------------

router.post('/api/sis/sync/webhook', (req, res) => {
  const parsed = webhookBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid webhook payload',
        details: parsed.error.issues,
      },
    });
    return;
  }

  const payload = parsed.data;

  console.log(`[SIS Webhook] Received ${payload.event_type} for OEN ${payload.oen} at school ${payload.school_code}`);

  // In a real implementation, this would trigger an incremental sync
  // for the affected student data
  res.json({
    success: true,
    data: {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      event_type: payload.event_type,
      oen: payload.oen,
      status: 'accepted',
      message: `SIS change notification for ${payload.event_type} accepted. Sync will be triggered.`,
    },
  });
});

export default router;
