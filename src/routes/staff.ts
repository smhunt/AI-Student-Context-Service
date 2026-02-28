import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import { resolvePermissionScope } from '../services/permissions.js';
import { verifyConsent } from '../services/consent.js';
import { generateEmbedding } from '../services/embedder.js';
import { searchSimilar } from '../db/queries/embeddings.js';
import { type LLMMessage } from '../services/llm-adapter.js';
import { createGateway } from '../services/llm-gateway.js';
import { logContextRetrieval } from '../services/audit.js';
import {
  getStudentsWithCourses, getSchoolStudentsWithInfo,
  getStaffCourses, getCourseInsights,
} from '../db/queries/staff-students.js';
import { currentAcademicYear, previousAcademicYear } from '../db/queries/staff-scope.js';
import { findUserById } from '../db/queries/users.js';
import type { UserRole } from '../types/index.js';

const router = Router();

const STAFF_ROLES: UserRole[] = [
  'teacher', 'educational_assistant', 'guidance_counsellor',
  'vice_principal', 'principal', 'supply_teacher',
];

function requireStaff(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

// List students in staff member's scope with course info
router.get('/api/staff/students', authMiddleware, async (req, res) => {
  if (!requireStaff(req.user!.role)) {
    res.status(403).json({ error: 'Staff access required' });
    return;
  }

  const role = req.user!.role as UserRole;
  const year = currentAcademicYear();
  const prevYear = previousAcademicYear();

  let rows;
  if (['principal', 'vice_principal', 'guidance_counsellor'].includes(role)) {
    rows = await getSchoolStudentsWithInfo(req.user!.userId, year);
  } else {
    const years = role === 'supply_teacher' ? [year] : [year, prevYear];
    rows = await getStudentsWithCourses(req.user!.userId, years);
  }

  // Group students and extract unique courses
  const studentMap = new Map<string, {
    id: string; name_first: string; name_last: string;
    email: string | null; grade: number | null;
    courses: { id: string; name: string; code: string | null; subject: string | null }[];
  }>();

  const courseMap = new Map<string, { id: string; name: string; code: string | null; subject: string | null }>();

  for (const r of rows) {
    if (!studentMap.has(r.student_id)) {
      studentMap.set(r.student_id, {
        id: r.student_id,
        name_first: r.name_first,
        name_last: r.name_last,
        email: r.email,
        grade: r.grade,
        courses: [],
      });
    }
    if (r.course_id) {
      const course = { id: r.course_id, name: r.course_name, code: r.course_code, subject: r.subject };
      if (!courseMap.has(r.course_id)) courseMap.set(r.course_id, course);
      const student = studentMap.get(r.student_id)!;
      if (!student.courses.some(c => c.id === r.course_id)) {
        student.courses.push(course);
      }
    }
  }

  res.json({
    students: Array.from(studentMap.values()),
    courses: Array.from(courseMap.values()),
  });
});

// Get staff member's courses
router.get('/api/staff/courses', authMiddleware, async (req, res) => {
  if (!requireStaff(req.user!.role)) {
    res.status(403).json({ error: 'Staff access required' });
    return;
  }

  const year = currentAcademicYear();
  const prevYear = previousAcademicYear();
  const courses = await getStaffCourses(req.user!.userId, [year, prevYear]);
  res.json({ courses });
});

// Class insights for a course
router.get('/api/staff/class/:courseId/insights', authMiddleware, async (req, res) => {
  if (!requireStaff(req.user!.role)) {
    res.status(403).json({ error: 'Staff access required' });
    return;
  }

  const insights = await getCourseInsights(req.params.courseId as string);
  res.json(insights);
});

// Generate report card comments
const reportCommentSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
  term: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  growth_areas: z.array(z.string()).optional(),
  tone: z.enum(['encouraging', 'balanced', 'direct']).optional(),
});

router.post('/api/staff/report-comments', authMiddleware, async (req, res) => {
  if (!requireStaff(req.user!.role)) {
    res.status(403).json({ error: 'Staff access required' });
    return;
  }

  const parsed = reportCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { student_id, course_id, term, strengths, growth_areas, tone } = parsed.data;

  // Verify permission
  const scope = await resolvePermissionScope(req.user!.userId, req.user!.boardId);
  if (!scope.studentIds.includes(student_id)) {
    res.status(403).json({ error: 'You do not have access to this student' });
    return;
  }

  // Get student info
  const student = await findUserById(student_id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  const studentName = `${student.name_first} ${student.name_last}`;

  // Check consent and get context
  const consent = await verifyConsent(student_id, scope.dataSources);
  let contextBlock = '';
  let chunksUsed: string[] = [];

  if (consent.allowed) {
    const queryText = `academic performance report card ${studentName}`;
    const queryVector = await generateEmbedding(queryText);
    const results = await searchSimilar(queryVector, student_id, {
      maxSensitivity: scope.sensitivityMax,
      limit: 8,
      sources: consent.filteredSources,
    });

    if (results.length > 0) {
      chunksUsed = results.map(r => r.chunk_id);
      contextBlock = results
        .map(r => `[${r.document_source}: ${r.document_title ?? 'Untitled'}]\n${r.content}`)
        .join('\n\n---\n\n');
    }
  }

  const toneLabel = tone ?? 'balanced';
  const systemPrompt = `You are a report card comment generator for Ontario schools following the Growing Success framework. Generate a professional report card comment for ${studentName}.

Requirements:
- Comment should be approximately 300-400 characters
- Reference specific evidence from the student's academic records
- Tone: ${toneLabel}
- Address Knowledge/Understanding, Thinking/Inquiry, Communication, and Application where evidence exists
${term ? `- Term: ${term}` : ''}
${strengths?.length ? `- Teacher-noted strengths: ${strengths.join(', ')}` : ''}
${growth_areas?.length ? `- Teacher-noted growth areas: ${growth_areas.join(', ')}` : ''}

Also provide brief Learning Skills observations (Responsibility, Organization, Independent Work, Collaboration, Initiative, Self-Regulation) if evidence supports them.

Format your response as:
COMMENT: [the report card comment]
LEARNING_SKILLS: [comma-separated brief observations]

${contextBlock ? `\n## Student Academic Context\n\n${contextBlock}` : 'No student records available. Generate a generic but professional comment template.'}`;

  try {
    const gateway = createGateway();
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a report card comment for ${studentName}.` },
    ];

    const llmResponse = await gateway.chat(messages, {
      boardId: req.user!.boardId,
      userId: req.user!.userId,
      requestType: 'report_comment',
    });

    // Parse the response
    const content = llmResponse.content;
    const commentMatch = content.match(/COMMENT:\s*([\s\S]*?)(?=LEARNING_SKILLS:|$)/i);
    const skillsMatch = content.match(/LEARNING_SKILLS:\s*([\s\S]*?)$/i);

    const comment = commentMatch?.[1]?.trim() || content;
    const learningSkills = skillsMatch?.[1]?.trim() || '';

    // Audit log
    if (chunksUsed.length > 0) {
      await logContextRetrieval({
        boardId: req.user!.boardId,
        actorId: req.user!.userId,
        targetStudentId: student_id,
        query: `Report card comment generation for ${studentName}`,
        chunksRetrieved: chunksUsed,
        chunkCount: chunksUsed.length,
        ipAddress: req.ip,
      });
    }

    res.json({
      comment,
      learning_skills: learningSkills,
      student_name: studentName,
      chunks_used: chunksUsed,
      model: llmResponse.model,
      latency_ms: llmResponse.latencyMs,
    });
  } catch (err) {
    console.error('Report comment error:', err);
    const message = (err as Error).message;
    if (message.includes('API_KEY') || message.includes('API key')) {
      res.status(503).json({ error: 'LLM service unavailable', message });
      return;
    }
    res.status(500).json({ error: 'Report comment generation failed', message });
  }
});

export default router;
