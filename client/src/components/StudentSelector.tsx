import { useState } from 'react';
import type { StaffStudent, StaffCourse } from '../api/client.js';

interface Props {
  students: StaffStudent[];
  courses: StaffCourse[];
  selectedStudent: StaffStudent | null;
  selectedCourseId: string | null;
  onSelectStudent: (s: StaffStudent | null) => void;
  onSelectCourse: (id: string | null) => void;
  loading: boolean;
}

export default function StudentSelector({
  students, courses, selectedStudent, selectedCourseId,
  onSelectStudent, onSelectCourse, loading,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? students.filter(s =>
        `${s.name_first} ${s.name_last}`.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  return (
    <div className="student-selector">
      <div className="selector-header">
        <h3>Students</h3>
        <span className="student-count">{students.length}</span>
      </div>

      <select
        className="course-filter"
        value={selectedCourseId ?? ''}
        onChange={e => onSelectCourse(e.target.value || null)}
      >
        <option value="">All Courses</option>
        {courses.map(c => (
          <option key={c.id} value={c.id}>
            {c.code ?? c.name}
          </option>
        ))}
      </select>

      <input
        className="student-search"
        type="text"
        placeholder="Search students..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="student-list">
        {loading && <p className="selector-msg">Loading students...</p>}
        {!loading && filtered.length === 0 && (
          <p className="selector-msg">No students found</p>
        )}
        {filtered.map(s => (
          <button
            key={s.id}
            className={`student-card ${selectedStudent?.id === s.id ? 'active' : ''}`}
            onClick={() => onSelectStudent(selectedStudent?.id === s.id ? null : s)}
          >
            <div className="student-card-name">
              {s.name_first} {s.name_last}
            </div>
            <div className="student-card-meta">
              {s.grade != null && <>Gr. {s.grade} &middot; </>}
              {s.courses.map(c => c.code ?? c.name).join(', ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
