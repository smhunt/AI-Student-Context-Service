import { google, type classroom_v1 } from 'googleapis';
import { config } from '../config/index.js';
import { ingestDocument } from './pipeline.js';
import { query } from '../db/index.js';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

/**
 * Generate OAuth consent URL for a board to authorize Google Classroom access.
 */
export function getAuthUrl(boardId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: boardId,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function handleOAuthCallback(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
}> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? undefined,
  };
}

export interface SyncResult {
  coursesProcessed: number;
  documentsIngested: number;
  errors: string[];
}

/**
 * Full sync: courses → coursework → submissions → ingest each as a document.
 */
export async function syncGoogleClassroom(params: {
  accessToken: string;
  boardId: string;
  schoolId: string;
}): Promise<SyncResult> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: params.accessToken });

  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

  const result: SyncResult = {
    coursesProcessed: 0,
    documentsIngested: 0,
    errors: [],
  };

  try {
    // 1. List courses
    const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
    const courses = coursesRes.data.courses ?? [];

    for (const course of courses) {
      try {
        await syncCourse(classroom, course, params, result);
        result.coursesProcessed++;
      } catch (err) {
        result.errors.push(`Course ${course.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Listing courses: ${(err as Error).message}`);
  }

  return result;
}

async function syncCourse(
  classroom: classroom_v1.Classroom,
  course: classroom_v1.Schema$Course,
  params: { accessToken: string; boardId: string; schoolId: string },
  result: SyncResult
): Promise<void> {
  const courseId = course.id!;

  // Get students in this course
  const studentsRes = await classroom.courses.students.list({ courseId });
  const students = studentsRes.data.students ?? [];

  // Build a map of student userId → our DB student
  const studentMap = new Map<string, { id: string; board_id: string }>();
  for (const student of students) {
    const email = student.profile?.emailAddress;
    if (!email) continue;

    const dbUser = await query<{ id: string; board_id: string }>(
      'SELECT id, board_id FROM users WHERE email = $1 AND board_id = $2',
      [email, params.boardId]
    );
    if (dbUser.rows.length > 0) {
      studentMap.set(student.userId!, dbUser.rows[0]);
    }
  }

  // Get coursework
  const courseworkRes = await classroom.courses.courseWork.list({ courseId });
  const courseworkItems = courseworkRes.data.courseWork ?? [];

  for (const work of courseworkItems) {
    // Ingest the coursework description as an assignment document
    if (work.description) {
      // Ingest for each known student in the course
      for (const [, dbStudent] of studentMap) {
        try {
          const ingested = await ingestDocument({
            student_id: dbStudent.id,
            board_id: params.boardId,
            source: 'google_classroom_assignment',
            source_id: `gc-work-${work.id}`,
            title: work.title ?? 'Untitled Assignment',
            content: `Assignment: ${work.title}\n\n${work.description}`,
            sensitivity: 'standard',
            metadata: { google_course_id: courseId, google_work_id: work.id },
          });
          if (!ingested.duplicate) result.documentsIngested++;
        } catch (err) {
          result.errors.push(`Work ${work.id}: ${(err as Error).message}`);
        }
      }
    }

    // Get submissions for this coursework
    try {
      const subsRes = await classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId: work.id!,
      });
      const submissions = subsRes.data.studentSubmissions ?? [];

      for (const sub of submissions) {
        const dbStudent = studentMap.get(sub.userId!);
        if (!dbStudent) continue;

        // Build submission content from attachments and grade
        const parts: string[] = [];
        if (sub.assignmentSubmission?.attachments) {
          for (const att of sub.assignmentSubmission.attachments) {
            if (att.driveFile) parts.push(`File: ${att.driveFile.title}`);
            if (att.link) parts.push(`Link: ${att.link.title ?? att.link.url}`);
          }
        }

        // Grade information
        if (sub.assignedGrade !== undefined && sub.assignedGrade !== null) {
          parts.push(`Grade: ${sub.assignedGrade}/${work.maxPoints ?? '?'}`);
          try {
            await ingestDocument({
              student_id: dbStudent.id,
              board_id: params.boardId,
              source: 'google_classroom_grade',
              source_id: `gc-grade-${sub.id}`,
              title: `Grade: ${work.title}`,
              content: `${work.title}: Grade ${sub.assignedGrade}/${work.maxPoints ?? '?'}`,
              sensitivity: 'standard',
              metadata: { google_submission_id: sub.id },
            });
            result.documentsIngested++;
          } catch (err) {
            result.errors.push(`Grade ${sub.id}: ${(err as Error).message}`);
          }
        }

        if (parts.length > 0) {
          try {
            await ingestDocument({
              student_id: dbStudent.id,
              board_id: params.boardId,
              source: 'google_classroom_submission',
              source_id: `gc-sub-${sub.id}`,
              title: `Submission: ${work.title}`,
              content: `Submission for "${work.title}":\n${parts.join('\n')}`,
              sensitivity: 'standard',
              metadata: { google_submission_id: sub.id, state: sub.state },
            });
            result.documentsIngested++;
          } catch (err) {
            result.errors.push(`Submission ${sub.id}: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      result.errors.push(`Submissions for ${work.id}: ${(err as Error).message}`);
    }
  }
}
