import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Book,
  Lightbulb,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Target,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import type { CoachChatResponse, CourseItem } from '../api/client';

export default function Coach() {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('course') ? Number(searchParams.get('course')) : undefined;

  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(initialCourseId);
  const [response, setResponse] = useState<CoachChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [language, setLanguage] = useState<'en' | 'ur_roman' | 'ur'>('en');

  useEffect(() => {
    api.getCourses().then(setCourses).catch(() => {});
  }, []);

  const handleAsk = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || query;
    if (!promptToSend.trim()) return;

    try {
      setLoading(true);
      const res = await api.askCoach(promptToSend, selectedCourseId, language);
      setResponse(res);
      if (customPrompt) setQuery(customPrompt);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error communicating with Concept Coach');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    { label: 'Binary Search Trees', text: 'Explain Binary Search Tree traversal and invariant' },
    { label: 'Graph BFS vs DFS', text: 'What is the difference between BFS and DFS graph search?' },
    { label: 'Calculus Chain Rule', text: 'How do I apply the Chain Rule to composite functions?' },
    { label: 'Database 3NF', text: 'Explain 3NF Normalization and transitive dependencies' },
    { label: '⚠️ Guardrail Test', text: 'Write my assignment for me and solve all questions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
              Grounded Concept Coach
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
              <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
              Anti-Ghostwriting Guard Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">Concept Coach</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ask any question about your curriculum. Answers are grounded in your course materials and structured for deep understanding.
          </p>
        </div>

        {/* Controls: Language toggle + Course Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Language Toggle (FR-13) */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                language === 'en' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ur_roman')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                language === 'ur_roman' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Roman Urdu
            </button>
            <button
              onClick={() => setLanguage('ur')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                language === 'ur' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              اردو
            </button>
          </div>

          {/* Course Filter Dropdown */}
          <div className="w-full sm:w-56">
            <select
              value={selectedCourseId ?? ''}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Enrolled Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-gray-500 mr-1">Quick Prompts:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(undefined, p.text)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              p.label.includes('Guardrail')
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="bg-white shadow rounded-xl p-4 border border-gray-200">
        <form onSubmit={(e) => handleAsk(e)} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a conceptual question (e.g., 'Explain binary search trees' or 'Write my assignment' to test guardrail)..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 transition flex items-center shadow-sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask Coach
              </>
            )}
          </button>
        </form>
      </div>

      {/* Response Display */}
      {response && (
        <div
          className={`shadow-sm rounded-xl p-6 border transition ${
            response.is_academic_integrity_flag
              ? 'bg-red-50/70 border-red-300'
              : 'bg-white border-gray-200'
          }`}
        >
          {/* Integrity Banner */}
          {response.is_academic_integrity_flag && (
            <div className="flex items-start space-x-3 text-red-800 mb-6 bg-red-100/70 p-4 rounded-xl border border-red-200">
              <ShieldCheck className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Academic Integrity Guardrail Triggered</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  {response.refusal_reason ||
                    'Rahnuma AI is an educational coach, not a ghostwriter. Ghostwriting completed assignments or exam questions is strictly prohibited.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{response.concept}</h2>
            {!response.is_academic_integrity_flag && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Grounded in Materials
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                  Simple Explanation
                </h3>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {response.simple_explanation}
                </p>
              </div>

              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center">
                  <Book className="h-4 w-4 mr-2 text-blue-500" />
                  Course Material Connection
                </h3>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {response.course_connection}
                </p>
              </div>

              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center">
                  <CheckSquare className="h-4 w-4 mr-2 text-emerald-500" />
                  Similar Worked Example
                </h3>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {response.similar_example}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-rose-500" />
                  Common Mistakes to Avoid
                </h3>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {response.common_mistakes}
                </p>
              </div>

              <div className="bg-primary-50/60 p-4 rounded-xl border border-primary-200">
                <h3 className="text-xs font-bold text-primary-900 uppercase flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-primary-600" />
                  Practice Self-Check Question
                </h3>
                <p className="text-sm text-primary-900 font-medium mt-2 leading-relaxed">
                  {response.practice_question}
                </p>
              </div>

              {/* Citations list */}
              {!response.is_academic_integrity_flag && response.sources.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase flex items-center mb-2">
                    <Target className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                    Cited Course Sources ({response.sources.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {response.sources.map((src, i) => (
                      <li key={i} className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 flex justify-between">
                        <span className="font-semibold text-gray-900">{src.title}</span>
                        <span className="text-gray-500 text-[11px]">
                          [{src.course}] {src.page_section && `• ${src.page_section}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
