import { useState, useCallback, useEffect } from 'react';
import {
  getStaffStudents, getClassInsights, generateReportComments,
  type StaffStudent, type StaffCourse, type CourseInsights, type ReportCommentResponse,
} from '../api/client.js';

export function useStaff() {
  const [students, setStudents] = useState<StaffStudent[]>([]);
  const [courses, setCourses] = useState<StaffCourse[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StaffStudent | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Insights
  const [insights, setInsights] = useState<CourseInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Report comments
  const [reportComment, setReportComment] = useState<ReportCommentResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStaffStudents();
      setStudents(data.students);
      setCourses(data.courses);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadInsights = useCallback(async (courseId: string) => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const data = await getClassInsights(courseId);
      setInsights(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const generateComment = useCallback(async (params: {
    student_id: string;
    course_id: string;
    term?: string;
    strengths?: string[];
    growth_areas?: string[];
    tone?: 'encouraging' | 'balanced' | 'direct';
  }) => {
    setReportLoading(true);
    setReportComment(null);
    setError(null);
    try {
      const data = await generateReportComments(params);
      setReportComment(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const filteredStudents = selectedCourseId
    ? students.filter(s => s.courses.some(c => c.id === selectedCourseId))
    : students;

  return {
    students: filteredStudents,
    allStudents: students,
    courses,
    selectedStudent,
    setSelectedStudent,
    selectedCourseId,
    setSelectedCourseId,
    loading,
    error,
    insights,
    insightsLoading,
    loadInsights,
    reportComment,
    reportLoading,
    generateComment,
  };
}
