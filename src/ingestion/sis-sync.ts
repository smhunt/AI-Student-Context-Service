import { createSISProvider, type SISProvider } from './sis/index.js';
import { ingestDocument } from './pipeline.js';
import type { DocumentSource, SensitivityLevel } from '../types/index.js';

export interface SyncResult {
  students_processed: number;
  documents_created: number;
  documents_skipped: number;
  errors: string[];
}

/**
 * Full SIS sync for a student — fetches all data types and ingests as documents.
 */
export async function syncStudent(
  oen: string,
  boardId: string,
  studentId: string,
  provider?: SISProvider,
): Promise<SyncResult> {
  const sis = provider || createSISProvider();
  const result: SyncResult = {
    students_processed: 1,
    documents_created: 0,
    documents_skipped: 0,
    errors: [],
  };

  // Report cards
  try {
    const reportCards = await sis.getReportCards(oen);
    for (const rc of reportCards) {
      const content = formatReportCard(rc);
      const r = await safeIngest({
        student_id: studentId,
        board_id: boardId,
        source: 'sis_report_card',
        title: `Report Card - ${rc.school_year} ${rc.term}`,
        content,
        sensitivity: 'standard',
        academic_year: rc.school_year,
      });
      if (r.duplicate) result.documents_skipped++;
      else result.documents_created++;
    }
  } catch (err) {
    result.errors.push(`report_cards: ${(err as Error).message}`);
  }

  // Transcript
  try {
    const transcript = await sis.getTranscript(oen);
    if (transcript) {
      const content = formatTranscript(transcript);
      const r = await safeIngest({
        student_id: studentId,
        board_id: boardId,
        source: 'sis_transcript',
        title: `Ontario Student Transcript`,
        content,
        sensitivity: 'standard',
      });
      if (r.duplicate) result.documents_skipped++;
      else result.documents_created++;
    }
  } catch (err) {
    result.errors.push(`transcript: ${(err as Error).message}`);
  }

  // Attendance
  try {
    const attendance = await sis.getAttendance(oen);
    if (attendance) {
      const content = formatAttendance(attendance);
      const r = await safeIngest({
        student_id: studentId,
        board_id: boardId,
        source: 'sis_attendance',
        title: `Attendance Record - ${attendance.school_year}`,
        content,
        sensitivity: 'standard',
        academic_year: attendance.school_year,
      });
      if (r.duplicate) result.documents_skipped++;
      else result.documents_created++;
    }
  } catch (err) {
    result.errors.push(`attendance: ${(err as Error).message}`);
  }

  // IEP (sensitive)
  try {
    const iep = await sis.getIEP(oen);
    if (iep) {
      const content = formatIEP(iep);
      const r = await safeIngest({
        student_id: studentId,
        board_id: boardId,
        source: 'sis_iep',
        title: `Individual Education Plan`,
        content,
        sensitivity: 'sensitive',
      });
      if (r.duplicate) result.documents_skipped++;
      else result.documents_created++;
    }
  } catch (err) {
    result.errors.push(`iep: ${(err as Error).message}`);
  }

  // EQAO
  try {
    const eqao = await sis.getEQAO(oen);
    if (eqao && eqao.results.length > 0) {
      const content = formatEQAO(eqao);
      const r = await safeIngest({
        student_id: studentId,
        board_id: boardId,
        source: 'assessment_eqao',
        title: `EQAO Assessment Results`,
        content,
        sensitivity: 'standard',
      });
      if (r.duplicate) result.documents_skipped++;
      else result.documents_created++;
    }
  } catch (err) {
    result.errors.push(`eqao: ${(err as Error).message}`);
  }

  return result;
}

async function safeIngest(params: {
  student_id: string;
  board_id: string;
  source: DocumentSource;
  title: string;
  content: string;
  sensitivity: SensitivityLevel;
  academic_year?: string;
}) {
  return ingestDocument({
    student_id: params.student_id,
    board_id: params.board_id,
    source: params.source,
    title: params.title,
    content: params.content,
    sensitivity: params.sensitivity,
    academic_year: params.academic_year,
  });
}

// --- Formatters: convert SIS records to prose for embedding ---

function formatReportCard(rc: any): string {
  const lines = [`Report Card — ${rc.school_year}, ${rc.term}, Grade ${rc.grade}`];
  for (const sub of rc.subjects) {
    lines.push(`\n${sub.name}: Overall ${sub.overall_mark || 'N/A'}`);
    if (sub.strand_marks) {
      for (const [strand, mark] of Object.entries(sub.strand_marks)) {
        lines.push(`  ${strand}: ${mark}`);
      }
    }
    if (sub.teacher_comment) lines.push(`  Comment: ${sub.teacher_comment}`);
  }
  if (rc.gpa) lines.push(`\nGPA: ${rc.gpa}`);
  return lines.join('\n');
}

function formatTranscript(t: any): string {
  const lines = [`Ontario Student Transcript — OEN: ${t.oen}`];
  lines.push(`Credits: ${t.credits_earned}/${t.credits_attempted} earned`);
  if (t.cumulative_gpa) lines.push(`Cumulative GPA: ${t.cumulative_gpa}`);
  lines.push('\nCourses:');
  for (const c of t.courses) {
    lines.push(`  ${c.code} ${c.name} — Grade ${c.grade_level}, Mark: ${c.final_mark}%, Credit: ${c.credit}`);
  }
  return lines.join('\n');
}

function formatAttendance(a: any): string {
  const s = a.summary;
  return [
    `Attendance Record — ${a.school_year}`,
    `School Days: ${s.total_school_days}`,
    `Present: ${s.present}, Late: ${s.late}`,
    `Absent (Excused): ${s.absent_excused}, Absent (Unexcused): ${s.absent_unexcused}`,
    `Attendance Rate: ${s.attendance_rate_percent}%`,
  ].join('\n');
}

function formatIEP(iep: any): string {
  const lines = [`Individual Education Plan — OEN: ${iep.oen}`];
  lines.push(`Exceptionality: ${iep.exceptionality}`);
  lines.push(`Placement: ${iep.placement}`);
  lines.push(`Review Date: ${iep.review_date}`);
  lines.push(`\nAccommodations: ${iep.accommodations.join('; ')}`);
  if (iep.learning_expectations?.length) {
    lines.push('\nLearning Expectations:');
    for (const le of iep.learning_expectations) {
      lines.push(`  ${le.subject}: ${le.expectation}`);
      lines.push(`    Strategies: ${le.strategies.join(', ')}`);
    }
  }
  return lines.join('\n');
}

function formatEQAO(eqao: any): string {
  const lines = [`EQAO Assessment Results — OEN: ${eqao.oen}`];
  for (const r of eqao.results) {
    lines.push(`  ${r.assessment} (${r.year}, Grade ${r.grade_level}): ${r.level} (${r.score}${r.percentile ? `, ${r.percentile}th percentile` : ''})`);
  }
  return lines.join('\n');
}
