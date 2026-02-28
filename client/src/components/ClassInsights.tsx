import { useEffect } from 'react';
import type { CourseInsights } from '../api/client.js';
import InsightCard from './InsightCard.js';

interface Props {
  courseId: string | null;
  insights: CourseInsights | null;
  loading: boolean;
  onLoad: (courseId: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  google_classroom_assignment: 'Assignments',
  google_classroom_submission: 'Submissions',
  google_classroom_grade: 'Grades',
  google_classroom_comment: 'Comments',
  sis_report_card: 'Report Cards',
  sis_transcript: 'Transcripts',
  sis_attendance: 'Attendance',
  sis_iep: 'IEPs',
  assessment_eqao: 'EQAO',
  assessment_board: 'Board Assessments',
  teacher_note: 'Teacher Notes',
  guidance_note: 'Guidance Notes',
  library_record: 'Library Records',
};

export default function ClassInsights({ courseId, insights, loading, onLoad }: Props) {
  useEffect(() => {
    if (courseId) onLoad(courseId);
  }, [courseId, onLoad]);

  if (!courseId) {
    return (
      <div className="insights-empty">
        <p>Select a course from the filter to view class insights.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="insights-empty">
        <div className="spinner" />
        <p>Loading insights...</p>
      </div>
    );
  }

  if (!insights) return null;

  const coverage = insights.student_count > 0
    ? Math.round((insights.students_with_docs / insights.student_count) * 100)
    : 0;

  return (
    <div className="class-insights">
      <div className="insights-grid">
        <InsightCard title="Students" value={insights.student_count} />
        <InsightCard title="Documents" value={insights.document_count} />
        <InsightCard title="Data Coverage" value={`${coverage}%`} subtitle={`${insights.students_with_docs} of ${insights.student_count} students`} />
        <InsightCard title="Missing Data" value={insights.students_without_docs} subtitle="Students with no documents" />
      </div>

      {Object.keys(insights.source_breakdown).length > 0 && (
        <div className="source-breakdown">
          <h4>Document Sources</h4>
          <div className="source-list">
            {Object.entries(insights.source_breakdown).map(([source, count]) => (
              <div key={source} className="source-row">
                <span className="source-label">{SOURCE_LABELS[source] ?? source}</span>
                <span className="source-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
