import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Target,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
  RotateCw,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { api } from '../api/client';
import type { CourseItem, ExamPrepResponse, QuizScoreResult } from '../api/client';

export default function ExamPrep() {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('course') ? Number(searchParams.get('course')) : undefined;

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(initialCourseId);
  const [topic, setTopic] = useState('Binary Search Trees');
  const [difficulty, setDifficulty] = useState('Medium');
  const [prepData, setPrepData] = useState<ExamPrepResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Active view: 'quiz' | 'flashcards' | 'revision'
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcards' | 'revision'>('quiz');

  // Quiz submission state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Flashcards state: index of flipped card
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.getCourses().then((data) => {
      setCourses(data);
      if (!selectedCourseId && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleGenerate = async (e?: React.FormEvent, customTopic?: string) => {
    if (e) e.preventDefault();
    const targetCourse = selectedCourseId || (courses[0]?.id ?? 1);
    const targetTopic = customTopic || topic;

    try {
      setLoading(true);
      setQuizResult(null);
      setSelectedAnswers({});
      setFlippedCards({});
      const res = await api.generateExamPrep(targetCourse, targetTopic, difficulty, 5);
      setPrepData(res);
      if (customTopic) setTopic(customTopic);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Exam prep generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (quizResult) return; // locked after submission
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionId });
  };

  const handleSubmitQuiz = async () => {
    if (!prepData) return;
    try {
      setSubmitting(true);
      const res = await api.submitQuiz(prepData.quiz_id || null, selectedAnswers);
      setQuizResult(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlip = (idx: number) => {
    setFlippedCards({ ...flippedCards, [idx]: !flippedCards[idx] });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
              <Target className="h-3.5 w-3.5 mr-1 text-rose-600" />
              Course-Grounded Exam Prep
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Exam Prep Studio</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate self-check practice quizzes, retention flashcards, and personalized revision schedules from your course materials.
          </p>
        </div>

        {/* Course and Difficulty Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={selectedCourseId ?? ''}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded-lg p-2 text-xs bg-gray-50 focus:bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 text-xs bg-gray-50 focus:bg-white"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generator Prompt Box */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <form onSubmit={(e) => handleGenerate(e)} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic to practice (e.g. Binary Search Trees, Graph BFS, Calculus Derivatives)..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate Prep
              </>
            )}
          </button>
        </form>

        {/* Quick Topic Buttons */}
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <span className="text-[11px] text-gray-500 font-semibold">Presets:</span>
          {['Binary Search Trees', 'Graph Search (BFS & DFS)', 'Calculus Derivatives', 'Database 3NF'].map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleGenerate(undefined, t)}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] rounded font-medium transition"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Content Area */}
      {prepData && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex border-b border-gray-200 bg-white px-6 rounded-t-xl">
            <button
              onClick={() => setActiveTab('quiz')}
              className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition flex items-center ${
                activeTab === 'quiz'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Target className="h-4 w-4 mr-1.5" />
              Practice Quiz ({prepData.quiz_questions.length})
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition flex items-center ${
                activeTab === 'flashcards'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Flashcards ({prepData.flashcards.length})
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition flex items-center ${
                activeTab === 'revision'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Revision Roadmap
            </button>
          </div>

          <div className="bg-white p-6 rounded-b-xl border border-gray-200 -mt-6">
            {/* 1. QUIZ TAB */}
            {activeTab === 'quiz' && (
              <div className="space-y-6">
                {/* Score Banner if Submitted */}
                {quizResult && (
                  <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    quizResult.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div>
                      <div className="flex items-center space-x-2">
                        {quizResult.passed ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-amber-600" />
                        )}
                        <h3 className="text-base font-bold text-gray-900">
                          {quizResult.passed ? 'Self-Check Passed!' : 'Review Recommended'}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{quizResult.coaching_advice}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-3xl font-black text-gray-900">{quizResult.score_percentage}%</span>
                      <p className="text-xs text-gray-500">
                        {quizResult.correct_count} of {quizResult.total_questions} correct
                      </p>
                    </div>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-6">
                  {prepData.quiz_questions.map((q, qIndex) => {
                    const breakdown = quizResult?.breakdown.find((b) => b.question_id === q.id);
                    const selected = selectedAnswers[q.id];

                    return (
                      <div key={q.id} className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                            Question {qIndex + 1} • {q.type}
                          </span>
                          <span className="text-[11px] text-gray-500 italic">
                            Grounding: {q.source_title}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 leading-snug">{q.question}</h4>

                        {/* Options */}
                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {q.options.map((opt) => {
                              const isChecked = selected === opt.id;
                              let optClass = 'bg-white border-gray-200 hover:border-primary-400';

                              if (breakdown) {
                                if (opt.id === q.correct_answer) {
                                  optClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                                } else if (isChecked && !breakdown.is_correct) {
                                  optClass = 'bg-rose-50 border-rose-400 text-rose-900';
                                }
                              } else if (isChecked) {
                                optClass = 'bg-primary-50 border-primary-600 text-primary-900 font-bold';
                              }

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSelectOption(q.id, opt.id)}
                                  className={`p-3 rounded-lg border text-left text-xs transition flex items-center justify-between ${optClass}`}
                                >
                                  <span><strong>{opt.id}.</strong> {opt.text}</span>
                                  {breakdown && opt.id === q.correct_answer && (
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation & Grounding if graded */}
                        {breakdown && (
                          <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs space-y-1">
                            <p className="text-gray-800">
                              <strong>Explanation:</strong> {breakdown.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!quizResult && (
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submitting || Object.keys(selectedAnswers).length === 0}
                      className="inline-flex items-center px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-lg shadow transition disabled:opacity-50"
                    >
                      {submitting ? 'Grading Answers...' : 'Submit Answers for Feedback'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. FLASHCARDS TAB */}
            {activeTab === 'flashcards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prepData.flashcards.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => toggleFlip(i)}
                    className="p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-primary-300 rounded-xl shadow-xs cursor-pointer min-h-[160px] flex flex-col justify-between transition"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Card {i + 1}</span>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">
                        {f.question}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      {flippedCards[i] ? (
                        <div className="text-xs text-primary-800 font-semibold bg-primary-50 p-2.5 rounded">
                          {f.answer}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-primary-600 flex items-center">
                          <RotateCw className="h-3 w-3 mr-1" />
                          Click to reveal answer
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. REVISION TAB */}
            {activeTab === 'revision' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Step-by-Step Revision Milestones</h4>
                  <ul className="space-y-2">
                    {prepData.revision_schedule.map((item, idx) => (
                      <li key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start">
                        <span className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mr-3 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {prepData.weak_areas_identified.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h5 className="text-xs font-bold text-amber-900 uppercase mb-1">Targeted Weak Areas</h5>
                    <ul className="text-xs text-amber-800 space-y-1">
                      {prepData.weak_areas_identified.map((area, i) => (
                        <li key={i}>• {area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
