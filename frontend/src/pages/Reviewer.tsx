import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  Award,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Upload,
  Send,
  CheckCircle,
  AlertTriangle,
  Globe,
  Lock
} from 'lucide-react';
import { api } from '../api/client';
import type { AssignmentItem, ReviewDraftResponse } from '../api/client';

export default function Reviewer() {
  const [searchParams] = useSearchParams();
  const initialAssignmentId = searchParams.get('assignment') ? Number(searchParams.get('assignment')) : undefined;

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | undefined>(initialAssignmentId);
  const [draftText, setDraftText] = useState('');
  const [draftFileName, setDraftFileName] = useState('');
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<ReviewDraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft Stager State (FR-11)
  const [showStagerModal, setShowStagerModal] = useState(false);
  const [staging, setStaging] = useState(false);
  const [stagedResult, setStagedResult] = useState<{
    message: string;
    filename: string;
    requires_manual_submit: boolean;
  } | null>(null);

  useEffect(() => {
    api.getAssignments().then((data) => {
      setAssignments(data);
      if (!selectedAssignmentId && data.length > 0) {
        setSelectedAssignmentId(data[0].id);
      }
    }).catch(() => {});
  }, []);

  const sampleDrafts = [
    {
      title: 'BST Traversal Draft (Good)',
      text: `In this assignment, we examine the construction and traversal of a Binary Search Tree (BST). 
The fundamental invariant requires that for each node, all keys in the left subtree are strictly smaller, 
and all keys in the right subtree are strictly greater. 

To verify this, we implemented an in-order traversal which recursively visits:
def in_order(node):
    if node:
        in_order(node.left)
        visit(node.val)
        in_order(node.right)

This algorithm achieves O(n) time complexity where n is the number of nodes, and space complexity O(h) 
proportional to tree height. As referenced in Lecture 4 (Sedgewick, Algorithms 4th Ed.), balanced BSTs 
guarantee O(log n) height whereas unbalanced insertions degenerate to O(n). We added edge case unit tests 
verifying duplicate keys, single-node trees, and empty tree handling.`
    },
    {
      title: 'Draft with Missing Citations',
      text: `We implemented graph traversal using BFS and DFS algorithms. 
BFS uses a queue to visit neighbors layer by layer and DFS uses a stack or recursion to go as deep as possible.
Both run in O(V + E) time. Our code passed the sample test cases and handles cycles properly.`
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraftFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setDraftText(content);
    };
    reader.readAsText(file);
  };

  const handleReview = async () => {
    if (!selectedAssignmentId) {
      alert('Please select an assignment.');
      return;
    }
    if (!ownershipConfirmed) {
      alert('You must confirm this is your own original work before receiving rubric feedback.');
      return;
    }
    if (draftText.trim().length < 50) {
      alert('Please provide a draft of at least 50 characters for meaningful analysis.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.analyzeDraft(selectedAssignmentId, draftText, ownershipConfirmed);
      setFeedback(res);
      setStagedResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Draft analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStageDraft = async () => {
    if (!selectedAssignmentId) return;
    try {
      setStaging(true);
      const filename = draftFileName || `Student_Draft_Assignment_${selectedAssignmentId}.txt`;
      const res = await api.stageDraft(selectedAssignmentId, draftText, filename);
      setStagedResult(res);
      setShowStagerModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Staging failed');
    } finally {
      setStaging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
              <Award className="h-3.5 w-3.5 mr-1 text-purple-600" />
              Rubric Alignment Reviewer
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
              <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
              Coaching Feedback • No Ghostwriting
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">Draft Reviewer & Stager Agent</h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit your self-authored draft to receive rubric-based critique and actionable recommendations. Stage it as an unsubmitted draft when satisfied.
          </p>
        </div>

        {/* Assignment selector */}
        <div className="w-full md:w-72">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Target Assignment:</label>
          <select
            value={selectedAssignmentId ?? ''}
            onChange={(e) => setSelectedAssignmentId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 shadow-xs"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.course_code}] {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Staged Confirmation Banner */}
      {stagedResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Draft Successfully Staged on LMS / AMS Portal
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Staged file: <strong>{stagedResult.filename}</strong> as an <em>unsubmitted draft</em>.
              </p>
              <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                🔒 Academic Integrity Gate: Rahnuma AI never automatically submits graded coursework. Please log into your LMS / AMS portal to review and click Final Submit personally.
              </p>
            </div>
          </div>

          <Link
            to="/portal"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 shadow-xs"
          >
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            View on Portal Window
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Draft Editor & Ownership Gate */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary-600" />
                Student Draft Content
              </h2>
              <span className="text-xs text-gray-400">
                {draftText.length} characters
              </span>
            </div>

            {/* File upload input */}
            <div className="flex items-center space-x-2">
              <label className="flex-1 cursor-pointer flex items-center justify-center space-x-2 border border-dashed border-gray-300 rounded-xl p-2.5 bg-gray-50 hover:bg-gray-100 transition text-xs text-gray-600 font-medium">
                <Upload className="h-4 w-4 text-primary-600" />
                <span className="truncate">
                  {draftFileName ? draftFileName : 'Upload draft file (.txt, .md, .py, .sql)'}
                </span>
                <input
                  type="file"
                  accept=".txt,.md,.py,.sql,.cpp,.java,.json,.html"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick samples */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-gray-400">Load Sample:</span>
              {sampleDrafts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDraftText(s.text);
                    setDraftFileName(s.title + '.txt');
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                >
                  {s.title.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Draft textarea */}
            <textarea
              rows={12}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Paste your assignment draft here (code explanations, essay paragraphs, or problem solutions)..."
              className="w-full text-xs p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono leading-relaxed"
            />

            {/* Ownership Confirmation Gate (Mandatory) */}
            <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ownershipConfirmed}
                  onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs text-purple-900 leading-snug font-medium">
                  <strong>Academic Integrity Pledge:</strong> I confirm this draft is my own original work. Rahnuma AI will critique my alignment against the rubric without ghostwriting or solving the assignment for me.
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              onClick={handleReview}
              disabled={loading || !ownershipConfirmed || draftText.trim().length < 50}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Rubric Alignment...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Evaluate Rubric Alignment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Rubric Feedback Results */}
        <div className="lg:col-span-7">
          {feedback ? (
            <div className="space-y-4">
              {/* Score / Alignment Banner & Stage Button */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-purple-500 gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Estimated Rubric Alignment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    For {feedback.course_code} • {feedback.assignment_title}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-black text-purple-700 bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-200">
                    {feedback.estimated_range}
                  </div>

                  {/* FR-11 Draft Stager Button */}
                  <button
                    onClick={() => setShowStagerModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    title="Stage this file as an unsubmitted draft on your LMS / AMS portal"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Stage Draft
                  </button>
                </div>
              </div>

              {/* Coaching Note */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{feedback.coaching_note}</span>
              </div>

              {/* Per-Criterion Feedback Cards */}
              <div className="space-y-3">
                {feedback.rubric_feedback.map((item, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">{item.criterion}</h4>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          item.status === 'Exceeds Expectations'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'On Track'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg text-xs border border-gray-100">
                      <span className="font-bold text-gray-500 block uppercase text-[10px]">Evidence in Draft:</span>
                      <p className="text-gray-700 italic mt-0.5">{item.evidence}</p>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-gray-800">
                        <strong>Feedback:</strong> {item.feedback}
                      </p>
                      <p className="text-primary-700">
                        <strong>Suggested Improvement:</strong> {item.suggested_improvement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300">
              <Award className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No Draft Evaluated Yet</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Paste your student draft or upload a draft file, check the academic integrity pledge, and click Evaluate Rubric Alignment to receive coaching critique.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Draft Stager Modal (FR-11 Human Approval Gate) */}
      {showStagerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-bold text-gray-900">Stage Unsubmitted Draft</h3>
              </div>
              <button onClick={() => setShowStagerModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                Mandatory Human-in-the-Loop Gate
              </p>
              <p>
                Rahnuma AI stages this file as an <strong>unsubmitted draft</strong> on your LMS / AMS portal. It will NOT submit the assignment. You must personally review the file on the LMS portal and click Final Submit.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Target Assignment:</span>
                <span className="font-bold text-gray-900">{feedback?.assignment_title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Course Code:</span>
                <span className="font-bold text-gray-900">{feedback?.course_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Staged Filename:</span>
                <span className="font-mono text-gray-800">{draftFileName || `Draft_${feedback?.course_code}.txt`}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStagerModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStageDraft}
                disabled={staging}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {staging ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Staging to Portal...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Approve & Stage Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
