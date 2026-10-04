import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Layers,
  Bell,
  Calendar,
  Sparkles,
  Target,
  ArrowLeft,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import type { CourseDetail as CourseDetailType } from '../api/client';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseDetailType | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'materials' | 'announcements' | 'quizzes'>('assignments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getCourse(Number(courseId));
        setCourse(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading course hub...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 bg-white rounded-xl border border-gray-200 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error || 'Course not found'}</p>
        <Link
          to="/courses"
          className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to all courses
        </Link>
      </div>

      {/* Course Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
              {course.code}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Instructor: {course.instructor || 'Faculty Member'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
            {course.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 max-w-3xl leading-relaxed">
            {course.description || 'Core academic curriculum synchronized from LMS.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/coach?course=${course.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask Coach
          </Link>
          <Link
            to={`/exam-prep?course=${course.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <Target className="h-4 w-4 mr-2 text-rose-500" />
            Practice Quiz
          </Link>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-gray-200 bg-white px-6 rounded-t-xl">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition ${
              activeTab === 'assignments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Assignments ({course.assignments.length})
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition ${
              activeTab === 'materials'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="h-4 w-4 mr-2" />
            Materials & Slides ({course.materials.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition ${
              activeTab === 'announcements'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="h-4 w-4 mr-2" />
            Announcements ({course.announcements.length})
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition ${
              activeTab === 'quizzes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Quizzes & Tests ({course.quizzes.length})
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-b-xl border border-gray-200 p-6 -mt-6">
        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {course.assignments.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No assignments listed for this course.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {course.assignments.map((a) => (
                  <div key={a.id} className="py-4 flex items-center justify-between hover:bg-gray-50/80 px-4 rounded-lg transition">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{a.title}</h4>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        {a.due_at && (
                          <span className="flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {new Date(a.due_at).toLocaleDateString()}
                          </span>
                        )}
                        {a.weight && <span>Weight: {a.weight}%</span>}
                        {a.estimated_minutes && <span>Est. Effort: {a.estimated_minutes}m</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/assignments/${a.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                      >
                        Inspect & Verify
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            {course.materials.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No course materials uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.materials.map((m) => (
                  <div key={m.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{m.title}</h4>
                        <span className="text-xs uppercase text-gray-500 font-semibold">{m.type}</span>
                      </div>
                    </div>
                    <Link
                      to={`/coach?course=${course.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      Ask Coach
                      <Sparkles className="h-3.5 w-3.5 ml-1 text-amber-500" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {course.announcements.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No announcements posted for this course.</p>
            ) : (
              <div className="space-y-4">
                {course.announcements.map((ann) => (
                  <div key={ann.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">{ann.title}</h4>
                      {ann.posted_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(ann.posted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {ann.content || 'No content provided.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            {course.quizzes.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No quizzes scheduled currently.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {course.quizzes.map((q) => (
                  <div key={q.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{q.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Topic: {q.topic || 'General Course Content'}</p>
                      {q.quiz_date && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                          Date: {new Date(q.quiz_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/exam-prep?course=${course.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold rounded-lg hover:bg-primary-100 transition"
                    >
                      <Target className="h-3.5 w-3.5 mr-1 text-rose-500" />
                      Take Practice Quiz
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
