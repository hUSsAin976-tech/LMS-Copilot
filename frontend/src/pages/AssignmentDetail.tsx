import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Layers,
  Check,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import type { AssignmentDetail as AssignmentDetailType } from '../api/client';

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<AssignmentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAssignment(Number(assignmentId));
      setAssignment(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const handleConfirm = async () => {
    if (!assignment) return;
    try {
      setConfirming(true);
      await api.confirmIntake({
        assignment_id: assignment.id,
        title: assignment.title,
        due_at: assignment.due_at,
        estimated_minutes: assignment.estimated_minutes || 120,
        weight: assignment.weight,
        requirements: assignment.requirements || [],
        rubric: assignment.rubric || [],
      });
      await fetchAssignment();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading assignment details...</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="p-8 bg-white rounded-xl border border-gray-200 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error || 'Assignment not found'}</p>
        <Link
          to="/assignments"
          className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back link */}
      <div>
        <Link
          to="/assignments"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to all assignments
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
              {assignment.course_code}
            </span>
            <span className="text-xs text-gray-500 font-medium">{assignment.course_name}</span>
            {assignment.confirmed ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified by Student
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending Verification
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
            {assignment.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
            {assignment.due_at && (
              <span className="flex items-center bg-gray-100 px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                Due: {new Date(assignment.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {assignment.weight && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-md">
                Weight: <strong>{assignment.weight}%</strong> of final grade
              </span>
            )}
            {assignment.estimated_minutes && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-md">
                Effort: <strong>{assignment.estimated_minutes} mins</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/coach?course=${assignment.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask Coach
          </Link>
          <Link
            to={`/reviewer?assignment=${assignment.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <Award className="h-4 w-4 mr-2 text-purple-600" />
            Review Draft
          </Link>
        </div>
      </div>

      {/* Human Approval Gate Banner */}
      {!assignment.confirmed && (
        <div className="p-5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                AI extracted this information. Please review and verify it.
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                To guarantee academic alignment, confirm the requirements and deadlines below before the Planner schedules this assignment.
              </p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50 flex-shrink-0"
          >
            <Check className="h-4 w-4 mr-1.5" />
            {confirming ? 'Confirming...' : 'Confirm & Save'}
          </button>
        </div>
      )}

      {/* Grid: Description & Extracted Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 📋 Teacher's Uploaded Task Sheet */}
          <div className="bg-white p-6 rounded-2xl border-2 border-primary-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    Teacher's Uploaded Task Sheet & Problem Statements
                  </h2>
                  <p className="text-xs text-gray-500">
                    Imported directly from university LMS / AMS portal instructor posting
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(assignment.task_instructions || assignment.description || '');
                  alert('Task instructions copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center"
              >
                Copy Tasks
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
              {assignment.task_instructions || assignment.description || 'No detailed instructions provided by instructor.'}
            </div>
          </div>

          {/* Extracted Requirements */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 flex items-center mb-3">
              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
              Extracted Deliverables & Constraints
            </h2>
            {assignment.requirements && assignment.requirements.length > 0 ? (
              <ul className="space-y-2">
                {assignment.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mr-3 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Requirements parsed from the teacher's task brief.</p>
            )}
          </div>

          {/* Rubric Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 flex items-center mb-4">
              <Award className="h-4 w-4 mr-2 text-purple-600" />
              Grading Rubric
            </h2>
            {assignment.rubric && assignment.rubric.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {assignment.rubric.map((r, idx) => (
                  <div key={idx} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{r.criterion}</h4>
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                      {r.points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Standard grading rubric applied.</p>
            )}
          </div>
        </div>

        {/* Sidebar: Related Materials & Quick Help */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 flex items-center mb-3">
              <Layers className="h-4 w-4 mr-2 text-blue-600" />
              Related Course Materials
            </h3>
            {assignment.related_materials && assignment.related_materials.length > 0 ? (
              <ul className="space-y-2">
                {assignment.related_materials.map((m) => (
                  <li key={m.id} className="p-3 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{m.title}</p>
                      <span className="text-[10px] uppercase text-gray-400 font-bold">{m.type}</span>
                    </div>
                    <Link
                      to={`/coach?course=${assignment.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Ground
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No materials directly tagged.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-6 rounded-xl border border-primary-200">
            <h3 className="text-sm font-bold text-primary-900 flex items-center mb-2">
              <Sparkles className="h-4 w-4 mr-2 text-primary-600" />
              Ways Rahnuma Can Help
            </h3>
            <ul className="space-y-2 text-xs text-primary-800">
              <li>• Break down difficult requirements into sub-tasks.</li>
              <li>• Explain algorithmic principles referenced in the prompt.</li>
              <li>• Review student draft against the rubric criteria above.</li>
              <li>• Detect scheduling bottlenecks in your calendar.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
