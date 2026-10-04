import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Layers,
  ArrowRight,
  Search,
  Sparkles,
  Target,
  RefreshCw,
  UserCheck,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import type { CourseItem } from '../api/client';

export default function Courses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCourses();
      setCourses(data);

      // Auto-expand current semester
      const initialExpanded: Record<string, boolean> = {};
      const semesters = Array.from(new Set(data.map(c => c.semester || 'Semester 5')));
      semesters.forEach(s => {
        initialExpanded[s] = data.some(c => c.semester === s && c.is_current);
      });
      // Fallback if none marked current
      if (!Object.values(initialExpanded).some(v => v) && semesters.length > 0) {
        initialExpanded['Semester 5'] = true;
      }
      setExpandedSemesters(initialExpanded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const toggleSemester = (semester: string) => {
    setExpandedSemesters(prev => ({
      ...prev,
      [semester]: !prev[semester]
    }));
  };

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor && c.instructor.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedSemester !== 'all') {
      return (c.semester || 'Semester 5') === selectedSemester;
    }
    return true;
  });

  // Group courses by semester
  const groupCoursesBySemester = (courseList: CourseItem[]): Record<string, CourseItem[]> => {
    const groups: Record<string, CourseItem[]> = {};
    for (const c of courseList) {
      const sem = c.semester || 'Semester 5';
      if (!groups[sem]) groups[sem] = [];
      groups[sem].push(c);
    }

    // Sort descending so Semester 5 is first, then 4, 3, 2, 1
    const sorted: Record<string, CourseItem[]> = {};
    const keys = Object.keys(groups).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      const aCurr = groups[a].some(c => c.is_current);
      const bCurr = groups[b].some(c => c.is_current);
      if (aCurr && !bCurr) return -1;
      if (!aCurr && bCurr) return 1;
      return numB - numA;
    });

    for (const k of keys) sorted[k] = groups[k];
    return sorted;
  };

  const semesterGroups = groupCoursesBySemester(filtered);
  const allSemestersList = Array.from(new Set(courses.map(c => c.semester || 'Semester 5'))).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numB - numA;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <GraduationCap className="h-3 w-3 mr-1" />
              University Academic Curriculum
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              {courses.length} Total Registered Courses
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">Courses & Semester Roadmap</h1>
          <p className="mt-1 text-sm text-gray-500">
            Divided by semester cards. Active courses in your current semester are monitored for real-time task extraction and AI coaching.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, title, or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 w-64"
            />
          </div>
          <button
            onClick={fetchCourses}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition"
            title="Refresh Courses"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Semester Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedSemester('all')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition ${
            selectedSemester === 'all'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Semesters ({courses.length})
        </button>
        {allSemestersList.map(sem => {
          const count = courses.filter(c => c.semester === sem).length;
          const isCurr = courses.some(c => c.semester === sem && c.is_current);
          return (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                selectedSemester === sem
                  ? 'bg-primary-600 text-white shadow-xs'
                  : isCurr
                  ? 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{sem}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedSemester === sem ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
              {isCurr && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Current Active Semester" />
              )}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
          <p className="text-gray-500 font-medium text-sm">Fetching courses from LMS connector...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-base font-semibold text-gray-900">No courses match your query</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? 'Try adjusting your search criteria.' : 'No courses found in this semester.'}
          </p>
        </div>
      ) : (
        /* ═══════ SEMESTER CARDS DIVISION ═══════ */
        <div className="space-y-6">
          {Object.entries(semesterGroups).map(([semester, semesterCourses]) => {
            const isCurrent = semesterCourses.some(c => c.is_current);
            const isExpanded = expandedSemesters[semester] ?? isCurrent;

            return (
              <div
                key={semester}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCurrent
                    ? 'border-primary-300 bg-primary-50/20 shadow-sm ring-1 ring-primary-100'
                    : 'border-gray-200 bg-white shadow-xs'
                }`}
              >
                {/* Semester Card Header (Collapsible) */}
                <button
                  onClick={() => toggleSemester(semester)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50/70 transition text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm ${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      S{semester.replace(/\D/g, '') || '?'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-black text-gray-900">{semester}</h2>
                        {isCurrent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                            Current Active Semester
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {semesterCourses.length} registered course{semesterCourses.length !== 1 ? 's' : ''} •{' '}
                        {semesterCourses.reduce((acc, c) => acc + (c.code.includes('L') ? 1 : 3), 0)} Total Credit Hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-500 hidden sm:inline">
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Course Grid inside Semester Card */}
                {isExpanded && (
                  <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {semesterCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
                      >
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-black bg-primary-50 text-primary-700 border border-primary-200">
                              {course.code}
                            </span>
                            <span className="text-[11px] text-gray-500 flex items-center">
                              <UserCheck className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span className="truncate max-w-[120px]">{course.instructor || 'Faculty'}</span>
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug group-hover:text-primary-700 transition">
                            {course.name}
                          </h3>

                          <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {course.description || 'Core university curriculum syllabus and weekly problem sets.'}
                          </p>

                          {/* Counts */}
                          <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                            <div className="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                              <FileText className="h-3.5 w-3.5 mr-1.5 text-blue-500 flex-shrink-0" />
                              <span className="truncate"><strong>{course.assignment_count}</strong> Tasks</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                              <Layers className="h-3.5 w-3.5 mr-1.5 text-emerald-500 flex-shrink-0" />
                              <span className="truncate"><strong>{course.material_count}</strong> Slides</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="bg-gray-50/70 px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex space-x-2 text-xs">
                            <Link
                              to={`/coach?course=${course.id}`}
                              className="text-gray-600 hover:text-primary-600 font-semibold flex items-center transition"
                              title="Ask Concept Coach"
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                              Coach
                            </Link>
                            <Link
                              to={`/exam-prep?course=${course.id}`}
                              className="text-gray-600 hover:text-primary-600 font-semibold flex items-center transition"
                              title="Practice Quiz"
                            >
                              <Target className="h-3.5 w-3.5 mr-1 text-rose-500" />
                              Quiz
                            </Link>
                          </div>

                          <Link
                            to={`/courses/${course.id}`}
                            className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center transition"
                          >
                            Course Hub
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
