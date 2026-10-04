import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  Award,
  ShieldCheck,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  UserCheck,
  Lock
} from 'lucide-react';

export default function Landing() {
  const agents = [
    {
      name: 'Fahmly',
      role: 'LMS Synchronizer',
      desc: 'Seamlessly connects to your LMS/AMS portal (FAST Flex, Moodle, Slate, Google Classroom) to synchronize courses, assignments, lecture slides, announcements, and quiz dates in real time.',
      icon: Database,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      name: 'Intake Agent',
      role: 'Requirements Analyst',
      desc: 'Parses complex assignment prompts and rubrics, extracting exact deliverables, constraints, and estimated effort into a student-verified brief.',
      icon: Cpu,
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      name: 'Planner Agent',
      role: 'Conflict-Aware Scheduler',
      desc: 'Generates a realistic day-by-day study schedule adapted to your available study hours, detecting overloaded days and overlapping deadlines.',
      icon: Calendar,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      name: 'Concept Coach',
      role: 'Grounded Academic Tutor',
      desc: 'Answers conceptual questions grounded directly in your professors slides and textbook readings, featuring built-in anti-ghostwriting guardrails.',
      icon: Sparkles,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      name: 'Draft Reviewer',
      role: 'Rubric Alignment Evaluator',
      desc: 'Analyzes student drafts against specific course rubrics, providing constructive critique and improvement suggestions without rewriting your work.',
      icon: Award,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      name: 'Exam Prep Studio',
      role: 'Knowledge & Retention Coach',
      desc: 'Generates course-specific practice quizzes, interactive flashcards, and weak-area revision plans directly from indexed course materials.',
      icon: Layers,
      color: 'bg-rose-100 text-rose-700',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Connect Your LMS',
      desc: 'Direct real-time authentication with your university email, password, and portal link. Fahmly indexes syllabus, slides, and coursework.',
    },
    {
      num: '02',
      title: 'Extract & Verify Requirements',
      desc: 'The Intake Agent extracts assignment rubrics and deadlines. You review and confirm every extracted milestone.',
    },
    {
      num: '03',
      title: 'Balance Your Workload',
      desc: 'The Planner schedules manageable 45–90 min study chunks, proactively alerting you to deadline collisions.',
    },
    {
      num: '04',
      title: 'Master Concepts & Polish Drafts',
      desc: 'Concept Coach clarifies foundational ideas, and Draft Reviewer evaluates your draft before you submit.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Rahnuma AI</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                MVP
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Student Workspace
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition"
            >
              Connect University LMS
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 bg-gradient-to-b from-primary-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-6">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Supervised Multi-Agent Architecture • Coach, Not Ghostwriter</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Your Supervised AI Guide Through University Life
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Rahnuma AI synchronizes your LMS courses, schedules conflict-aware study plans, coaches difficult concepts using course materials, and critiques your drafts without ghostwriting.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg transition"
            >
              Connect University LMS / AMS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/coach"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-gray-300 text-base font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition"
            >
              Test Concept Coach
            </Link>
          </div>

          {/* Quick Value Metrics */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-gray-200/80">
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">Live</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">Real-Time Portal Sync</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">100%</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">Human-in-the-Loop Approval</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">0</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">Ghostwriting & Auto-Submissions</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">1-Click</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">Calendar & Data Reset</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / Core Journey */}
      <section className="py-20 bg-gray-50 border-y border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary-600">Workflow</h2>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">The Complete Student Journey</h3>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              From course synchronization to draft submission, Rahnuma ensures transparent agency at every stage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                <span className="text-3xl font-extrabold text-primary-100 select-none">{s.num}</span>
                <h4 className="text-lg font-bold text-gray-900 mt-2">{s.title}</h4>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Multi-Agent Ecosystem */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary-600">Ecosystem</h2>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">Specialized Multi-Agent Guild</h3>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              Each agent has an explicit single responsibility, strict typing, and full trace auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${agent.color}`}>
                      <agent.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {agent.role}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">{agent.name}</h4>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Integrity Manifesto */}
      <section className="py-20 bg-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-800 text-primary-200 text-xs font-semibold mb-4">
              <Lock className="h-3.5 w-3.5" />
              <span>Academic Integrity Manifesto</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              We Empower Learning. We Never Ghostwrite.
            </h3>
            <p className="mt-4 text-primary-100 text-base leading-relaxed">
              University honor codes exist so students develop real mastery. Rahnuma AI is built from the ground up with defensive integrity guardrails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-primary-800/80 p-6 rounded-2xl border border-primary-700">
              <UserCheck className="h-8 w-8 text-primary-300 mb-3" />
              <h4 className="text-lg font-bold">Human-in-the-Loop Always</h4>
              <p className="mt-2 text-sm text-primary-200 leading-relaxed">
                Extracted deadlines require student confirmation. Draft reviews require student ownership verification. No action happens without your consent.
              </p>
            </div>

            <div className="bg-primary-800/80 p-6 rounded-2xl border border-primary-700">
              <ShieldCheck className="h-8 w-8 text-primary-300 mb-3" />
              <h4 className="text-lg font-bold">Active Anti-Ghostwriting</h4>
              <p className="mt-2 text-sm text-primary-200 leading-relaxed">
                Concept Coach actively intercepts queries asking for completed solutions or essay generation, redirecting to foundational explanations and analogous examples.
              </p>
            </div>

            <div className="bg-primary-800/80 p-6 rounded-2xl border border-primary-700">
              <BookOpen className="h-8 w-8 text-primary-300 mb-3" />
              <h4 className="text-lg font-bold">Course-Grounded Sources</h4>
              <p className="mt-2 text-sm text-primary-200 leading-relaxed">
                Every explanation and quiz question cites your professor’s lecture slides, textbook sections, and syllabus readings, preventing hallucinated answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-primary-600" />
            <span className="font-semibold text-gray-900">Rahnuma AI</span>
            <span>— Supervised Multi-Agent Student Guide</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="hover:text-primary-600 transition">Dashboard</Link>
            <Link to="/courses" className="hover:text-primary-600 transition">Courses</Link>
            <Link to="/coach" className="hover:text-primary-600 transition">Concept Coach</Link>
            <Link to="/settings" className="hover:text-primary-600 transition">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
