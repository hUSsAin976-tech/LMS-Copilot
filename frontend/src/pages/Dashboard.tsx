import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Calendar, Clock, AlertTriangle, RefreshCw,
  CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Check,
  GraduationCap
} from 'lucide-react';
import { api } from '../api/client';
import type { DashboardData, StudyPlanResponse } from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Detect the current semester from portal state or student profile */
  const [currentSemester, setCurrentSemester] = useState<string>('Current Semester');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, planRes] = await Promise.all([
        api.getDashboard(),
        api.getStudyPlan().catch(() => null),
      ]);
      setData(dashRes);
      if (dashRes.current_semester) {
        setCurrentSemester(dashRes.current_semester);
      }
      if (planRes) setStudyPlan(planRes);

      // Try to determine current semester from portal if not set
      if (!dashRes.current_semester) {
        try {
          const portalRes = await api.getPortalView();
          if (portalRes?.student?.semester) {
            setCurrentSemester(portalRes.student.semester);
          }
        } catch {
          // Not critical, continue with defaults
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time synchronization polling every 15 seconds
    const pollTimer = setInterval(() => {
      api.getDashboard()
        .then((dashRes) => {
          setData(dashRes);
          if (dashRes.current_semester) setCurrentSemester(dashRes.current_semester);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(pollTimer);
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.syncLMS();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.togglePlanTask(taskId);
      if (studyPlan) {
        const updatedDays = studyPlan.days.map((day) => ({
          ...day,
          tasks: day.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        }));
        setStudyPlan({ ...studyPlan, days: updatedDays });
      }
    } catch (err: unknown) {
      console.error('Failed to toggle task', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-10 w-10 text-primary-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading your academic dashboard...</p>
      </div>
    );
  }

  const todayTasks = studyPlan?.days?.[0]?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Live Portal: {data?.portal_name || (data?.lms_status === 'connected' ? 'Connected' : data?.lms_status)}
            </span>
            {data?.last_sync && (
              <span className="text-xs text-gray-500">
                Last synced: {new Date(data.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {/* Current Semester Badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <GraduationCap className="h-3 w-3 mr-1" />
              {currentSemester}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Welcome back, {data?.user?.name || 'Student'} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Showing <strong>{currentSemester}</strong> overview. Rahnuma AI is monitoring your deadlines and tutoring your concepts.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin text-primary-600' : 'text-gray-500'}`} />
            {syncing ? 'Syncing LMS...' : 'Sync LMS'}
          </button>
          <Link
            to="/coach"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask Coach
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-semibold ml-4">Retry</button>
        </div>
      )}

      {/* Stats Grid — Current Semester Only */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{currentSemester} Courses</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{data?.course_count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tasks Due This Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{data?.tasks_due_this_week || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4 flex-1 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming Exam</p>
              <p className="text-sm font-bold text-gray-900 truncate mt-0.5">
                {data?.upcoming_quiz?.title || 'None Scheduled'}
              </p>
              <p className="text-xs text-purple-600 font-medium">{data?.upcoming_quiz?.course_code || ''}</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's Study Target</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {Math.round((studyPlan?.daily_capacity_minutes || 180) / 60)} hrs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Deadlines & Today's Plan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Deadlines */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Deadlines</h2>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                {data?.upcoming_deadlines?.length || 0}
              </span>
            </div>
            <Link to="/assignments" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.upcoming_deadlines && data.upcoming_deadlines.length > 0 ? (
              data.upcoming_deadlines.map((item) => (
                <Link
                  key={item.id}
                  to={`/assignments/${item.id}`}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-gray-100 hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-sm transition group"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                        {item.course_code}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition">{item.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Est. {item.estimated_minutes || 60}m • Weight: {item.weight || 10}%
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      {item.due_at ? new Date(item.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-6 text-center">No pending assignments due soon! 🎉</p>
            )}
          </div>
        </div>

        {/* Today's Study Plan Tasks */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Today's Study Plan</h2>
              <p className="text-xs text-gray-500">Generated by Planner Agent to prevent deadline crunch</p>
            </div>
            <Link to="/planner" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center">
              Full schedule <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-3">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                    task.completed
                      ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-75'
                      : 'bg-white border-gray-200 hover:border-primary-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center transition ${
                        task.completed ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'
                      }`}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.course_code} • {task.allocated_minutes} mins {task.due_date_str && `• ${task.due_date_str}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 flex-shrink-0">
                    {task.allocated_minutes}m
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">All planned tasks completed for today!</p>
                <Link to="/planner" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                  View upcoming days
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Agent Activity Stream */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Live Agent Supervision Trace</h2>
            </div>
            <p className="text-xs text-gray-500">
              Audit log of Fahmly, Concept Coach, Intake, Planner, and Reviewer agent actions.
            </p>
          </div>
          <Link to="/activity" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            View full log
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {data?.recent_activity && data.recent_activity.length > 0 ? (
            data.recent_activity.slice(0, 5).map((trace) => (
              <div key={trace.id} className="py-3 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 text-xs font-bold rounded-md ${
                      trace.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trace.status === 'blocked'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {trace.agent}
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">{trace.summary}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Action: <span className="font-medium text-gray-600">{trace.action}</span>
                      {trace.duration_ms !== null && ` • ${trace.duration_ms}ms`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                  {trace.timestamp ? new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">No agent actions recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
