import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Cpu,
  AlertCircle,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import type { AssignmentItem, IntakeExtractResponse } from '../api/client';

export default function Assignments() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [error, setError] = useState<string | null>(null);

  // Intake Extraction Modal State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractAssignmentId, setExtractAssignmentId] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [extractedData, setExtractedData] = useState<IntakeExtractResponse | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAssignments();
      setAssignments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleRunExtract = async () => {
    try {
      setExtractLoading(true);
      setExtractedData(null);
      setConfirmSuccess(false);
      const res = await api.extractIntake(extractAssignmentId || undefined, customText || undefined);
      setExtractedData(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtractLoading(false);
    }
  };

  const handleConfirmExtraction = async () => {
    if (!extractedData) return;
    try {
      setExtractLoading(true);
      const targetId = extractedData.assignment_id || (assignments[0]?.id ?? 1);
      await api.confirmIntake({
        assignment_id: targetId,
        title: extractedData.title,
        due_at: extractedData.due_at,
        estimated_minutes: extractedData.estimated_minutes,
        weight: extractedData.weight,
        requirements: extractedData.requirements,
        constraints: extractedData.constraints,
        citation_requirements: extractedData.citation_requirements,
        rubric: extractedData.rubric,
      });
      setConfirmSuccess(true);
      await loadAssignments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setExtractLoading(false);
    }
  };

  const [selectedAssignmentModal, setSelectedAssignmentModal] = useState<AssignmentItem | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>('all');

  const filtered = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.course_code.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'confirmed' && !a.confirmed) return false;
    if (statusFilter === 'pending' && a.confirmed) return false;
    if (semesterFilter !== 'all' && (a.semester || 'Semester 5') !== semesterFilter) return false;
    return true;
  });

  const semestersList = Array.from(new Set(assignments.map(a => a.semester || 'Semester 5'))).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numB - numA;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments & Intake</h1>
          <p className="mt-1 text-sm text-gray-500">
            Intake Agent parses deliverables, estimates effort, and requires student verification before scheduling.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setIsExtracting(!isExtracting);
              setExtractedData(null);
              setConfirmSuccess(false);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
          >
            <Cpu className="h-4 w-4 mr-2" />
            {isExtracting ? 'Close Intake Studio' : 'Run Intake Agent'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Interactive Intake Extraction Studio */}
      {isExtracting && (
        <div className="bg-white p-6 rounded-xl border-2 border-primary-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Intake Agent Extraction Studio</h3>
                <p className="text-xs text-gray-500">
                  Select an enrolled assignment or paste custom syllabus instructions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select LMS Assignment
              </label>
              <select
                value={extractAssignmentId || ''}
                onChange={(e) => setExtractAssignmentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white"
              >
                <option value="">Choose an assignment...</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.course_code}] {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Or Paste Raw Assignment Text / Prompt
              </label>
              <input
                type="text"
                placeholder="e.g. Implement AVL Tree rotation with 10 unit tests by Friday..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRunExtract}
              disabled={extractLoading || (!extractAssignmentId && !customText)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {extractLoading ? 'Extracting Requirements...' : 'Analyze & Extract'}
            </button>
          </div>

          {/* Extracted Results Panel with Human Confirmation Gate */}
          {extractedData && (
            <div className="bg-primary-50/50 border border-primary-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-primary-800">
                <AlertCircle className="h-5 w-5 text-primary-600" />
                <h4 className="text-sm font-bold">
                  AI extracted this information. Please verify it.
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-primary-100 text-xs text-gray-700">
                <div>
                  <span className="font-semibold text-gray-500 block">Deliverable</span>
                  <span className="font-bold text-gray-900">{extractedData.title}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Extracted Deadline</span>
                  <span>{new Date(extractedData.due_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Estimated Effort</span>
                  <span>{extractedData.estimated_minutes} minutes</span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-700 mb-1.5 uppercase">Extracted Requirements:</h5>
                <ul className="space-y-1.5">
                  {extractedData.requirements.map((req, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-white p-2.5 rounded border border-gray-100 flex items-start">
                      <span className="h-4 w-4 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center mr-2 flex-shrink-0">
                        {i + 1}
                      </span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {extractedData.constraints.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-gray-700 mb-1.5 uppercase">Constraints:</h5>
                  <ul className="space-y-1">
                    {extractedData.constraints.map((c, i) => (
                      <li key={i} className="text-xs text-amber-900 bg-amber-50 p-2 rounded">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirmation Actions */}
              {!confirmSuccess ? (
                <div className="pt-3 border-t border-primary-200 flex space-x-3">
                  <button
                    onClick={handleConfirmExtraction}
                    disabled={extractLoading}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Confirm & Save to Planner
                  </button>
                  <button
                    onClick={() => setExtractedData(null)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Reject & Dismiss
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Successfully verified and saved! The Planner will now incorporate this task.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 bg-gray-50"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({assignments.filter((a) => !a.confirmed).length})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'confirmed'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Verified ({assignments.filter((a) => a.confirmed).length})
          </button>
        </div>
      </div>

      {/* Semester Sub-Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-500 font-bold mr-1">Semester:</span>
        <button
          onClick={() => setSemesterFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            semesterFilter === 'all'
              ? 'bg-primary-50 text-primary-700 border border-primary-300 shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Semesters
        </button>
        {semestersList.map(sem => {
          const isCurr = assignments.some(a => a.semester === sem && a.is_current);
          return (
            <button
              key={sem}
              onClick={() => setSemesterFilter(sem)}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                semesterFilter === sem
                  ? 'bg-primary-50 text-primary-700 border border-primary-300 shadow-xs'
                  : isCurr
                  ? 'bg-blue-50/70 border border-blue-200 text-blue-800 hover:bg-blue-100'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{sem}</span>
              {isCurr && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Assignments List */}
      {loading && assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
          <p className="text-gray-500 font-medium text-sm">Loading assignments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-base font-semibold text-gray-900">No assignments match your criteria</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => setSelectedAssignmentModal(item)}>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary-50 text-primary-700">
                    {item.course_code}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{item.course_name}</span>
                  {item.semester && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {item.semester}
                    </span>
                  )}
                  {item.confirmed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                      Unverified
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 hover:text-primary-600 transition">{item.title}</h3>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {item.due_at && (
                    <span className="flex items-center text-amber-700 font-medium">
                      <Clock className="h-3 w-3 mr-1" />
                      Due: {new Date(item.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {item.weight && <span>Weight: {item.weight}%</span>}
                  {item.estimated_minutes && <span>Est: {item.estimated_minutes}m</span>}
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => setSelectedAssignmentModal(item)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition border border-blue-200"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  View Teacher Tasks
                </button>
                <Link
                  to={`/assignments/${item.id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition"
                >
                  Details & Rubric
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📋 Teacher Task Sheet Modal */}
      {selectedAssignmentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedAssignmentModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                    {selectedAssignmentModal.course_code}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedAssignmentModal.course_name}
                  </span>
                </div>
                <h2 className="text-lg font-black text-gray-900">{selectedAssignmentModal.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAssignmentModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <span className="flex items-center text-red-600 font-semibold">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Due: {selectedAssignmentModal.due_at ? new Date(selectedAssignmentModal.due_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Soon'}
              </span>
              <span>Weight: <strong>{selectedAssignmentModal.weight || 10}%</strong></span>
              <span>Effort: <strong>{selectedAssignmentModal.estimated_minutes || 120} mins</strong></span>
            </div>

            {/* Teacher's Uploaded Task Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-primary-600" />
                  Teacher's Uploaded Task Brief & Problem Statement
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAssignmentModal.task_instructions || selectedAssignmentModal.description || '');
                    alert('Task instructions copied!');
                  }}
                  className="text-xs text-primary-600 font-bold hover:underline"
                >
                  Copy Prompt
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto">
                {selectedAssignmentModal.task_instructions || selectedAssignmentModal.description || 'Complete the assigned weekly coursework problem set.'}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
              <Link
                to={`/reviewer?assignment=${selectedAssignmentModal.id}`}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold text-center transition"
                onClick={() => setSelectedAssignmentModal(null)}
              >
                Start Draft Reviewer
              </Link>
              <Link
                to={`/coach?course=${selectedAssignmentModal.id}`}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold text-center transition"
                onClick={() => setSelectedAssignmentModal(null)}
              >
                Ask Concept Coach
              </Link>
              <Link
                to={`/assignments/${selectedAssignmentModal.id}`}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition text-center"
                onClick={() => setSelectedAssignmentModal(null)}
              >
                Full Hub
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

