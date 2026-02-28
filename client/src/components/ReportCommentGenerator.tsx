import { useState, type FormEvent } from 'react';
import type { ReportCommentResponse, StaffStudent, StaffCourse } from '../api/client.js';

interface Props {
  student: StaffStudent | null;
  courses: StaffCourse[];
  selectedCourseId: string | null;
  result: ReportCommentResponse | null;
  loading: boolean;
  onGenerate: (params: {
    student_id: string;
    course_id: string;
    term?: string;
    strengths?: string[];
    growth_areas?: string[];
    tone?: 'encouraging' | 'balanced' | 'direct';
  }) => void;
}

export default function ReportCommentGenerator({
  student, courses, selectedCourseId, result, loading, onGenerate,
}: Props) {
  const [courseId, setCourseId] = useState(selectedCourseId ?? '');
  const [tone, setTone] = useState<'encouraging' | 'balanced' | 'direct'>('balanced');
  const [strengths, setStrengths] = useState('');
  const [growthAreas, setGrowthAreas] = useState('');
  const [copied, setCopied] = useState(false);

  if (!student) {
    return (
      <div className="report-empty">
        <p>Select a student to generate report card comments.</p>
      </div>
    );
  }

  const studentCourses = courses.filter(c =>
    student.courses.some(sc => sc.id === c.id)
  );
  const activeCourseId = courseId || studentCourses[0]?.id || '';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCourseId) return;
    onGenerate({
      student_id: student!.id,
      course_id: activeCourseId,
      tone,
      strengths: strengths.trim() ? strengths.split(',').map(s => s.trim()) : undefined,
      growth_areas: growthAreas.trim() ? growthAreas.split(',').map(s => s.trim()) : undefined,
    });
  }

  function handleCopy() {
    if (result?.comment) {
      navigator.clipboard.writeText(result.comment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="report-generator">
      <h3>Report Card Comments for {student.name_first} {student.name_last}</h3>

      <form onSubmit={handleSubmit} className="report-form">
        <label>
          <span>Course</span>
          <select value={activeCourseId} onChange={e => setCourseId(e.target.value)}>
            {studentCourses.length === 0 && <option value="">No courses</option>}
            {studentCourses.map(c => (
              <option key={c.id} value={c.id}>{c.code ?? c.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Tone</span>
          <select value={tone} onChange={e => setTone(e.target.value as typeof tone)}>
            <option value="encouraging">Encouraging</option>
            <option value="balanced">Balanced</option>
            <option value="direct">Direct</option>
          </select>
        </label>

        <label>
          <span>Strengths (comma-separated, optional)</span>
          <input
            type="text"
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            placeholder="problem solving, collaboration"
          />
        </label>

        <label>
          <span>Growth areas (comma-separated, optional)</span>
          <input
            type="text"
            value={growthAreas}
            onChange={e => setGrowthAreas(e.target.value)}
            placeholder="showing work, time management"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={loading || !activeCourseId}>
          {loading ? 'Generating...' : 'Generate Comment'}
        </button>
      </form>

      {result && (
        <div className="report-result">
          <div className="report-comment-box">
            <div className="report-comment-header">
              <h4>Report Card Comment</h4>
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="report-comment-text">{result.comment}</p>
            <p className="report-comment-chars">{result.comment.length} characters</p>
          </div>

          {result.learning_skills && (
            <div className="report-skills">
              <h4>Learning Skills</h4>
              <p>{result.learning_skills}</p>
            </div>
          )}

          <div className="report-meta">
            {result.chunks_used.length} source{result.chunks_used.length !== 1 ? 's' : ''} used
            &middot; {(result.latency_ms / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}
