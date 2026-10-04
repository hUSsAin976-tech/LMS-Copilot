import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Download,
  Clock,
  RefreshCw,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import type { StudyPlanResponse } from '../api/client';

export default function Planner() {
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [dailyHours, setDailyHours] = useState(3);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const plan = await api.getStudyPlan();
      setStudyPlan(plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const plan = await api.generateStudyPlan(dailyHours);
      setStudyPlan(plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!studyPlan) return;
    try {
      await api.togglePlanTask(taskId);
      const updatedDays = studyPlan.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
      }));
      setStudyPlan({ ...studyPlan, days: updatedDays });
    } catch (err: unknown) {
      console.error('Failed to toggle task', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Planner Agent</h1>
          <p className="mt-1 text-sm text-gray-500">
            Conflict-aware scheduling engine. Dynamically distributes homework and exam prep into manageable chunks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span>Target:</span>
            <select
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="bg-transparent font-bold text-primary-700 outline-none"
            >
              <option value={2}>2 hrs / day</option>
              <option value={3}>3 hrs / day</option>
              <option value={4}>4 hrs / day</option>
              <option value={5}>5 hrs / day</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-xs font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {generating ? 'Regenerating...' : 'Regenerate Plan'}
          </button>

          <a
            href={api.getExportIcsUrl()}
            download="rahnuma_schedule.ics"
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <Download className="h-4 w-4 mr-1.5 text-gray-500" />
            Export .ics Calendar
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && !studyPlan ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
          <p className="text-gray-500 font-medium text-sm">Generating your personalized schedule...</p>
        </div>
      ) : studyPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-Day Plan */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">7-Day Study Roadmap</h2>
              <span className="text-xs text-gray-500 font-medium">
                Total Planned: <strong>{Math.round(studyPlan.total_scheduled_minutes / 60)} hrs</strong>
              </span>
            </div>

            <div className="space-y-4">
              {studyPlan.days.map((day, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-xl border p-5 transition ${
                    day.is_overloaded ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-primary-600" />
                      <h3 className="font-bold text-sm text-gray-900">{day.day_name}</h3>
                      {day.is_overloaded && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Overloaded Day
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-500">
                      {Math.floor(day.total_minutes / 60)}h {day.total_minutes % 60}m planned
                    </span>
                  </div>

                  {day.tasks.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Buffer day. No heavy assignments scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition select-none ${
                            task.completed
                              ? 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                              : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-xs text-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`h-5 w-5 rounded border flex items-center justify-center transition ${
                                task.completed
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {task.completed && <Check className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700 mr-2">
                                {task.course_code}
                              </span>
                              <span className="text-xs font-semibold">{task.title}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {task.due_date_str && (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                {task.due_date_str}
                              </span>
                            )}
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {task.allocated_minutes}m
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar: Conflicts, Warnings, and Reasoning */}
          <div className="space-y-6">
            {/* AI Reasoning Summary */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-5 rounded-xl border border-primary-200 shadow-xs">
              <h3 className="text-xs font-bold text-primary-900 uppercase flex items-center mb-2">
                <Sparkles className="h-4 w-4 mr-1.5 text-primary-600" />
                Planner Agent Reasoning
              </h3>
              <p className="text-xs text-primary-900 leading-relaxed">
                {studyPlan.reasoning_summary}
              </p>
            </div>

            {/* Conflicts */}
            {studyPlan.conflicts.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase">Workload Overload Detected</h4>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800">
                      {studyPlan.conflicts.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {studyPlan.warnings.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 uppercase">Deadline Clashing Alerts</h4>
                    <ul className="mt-2 space-y-1 text-xs text-blue-800">
                      {studyPlan.warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Export Tip */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2">
              <h4 className="font-bold text-gray-900">Sync with Apple/Google Calendar</h4>
              <p>
                Download the `.ics` file to import confirmed deadlines and daily milestones into your phone or calendar client.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
