import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Globe,
  Lock,
  Mail,
  Key,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Server,
  Zap
} from 'lucide-react';
import { api } from '../api/client';

const PORTAL_PRESETS = [
  {
    id: 'fast',
    name: 'FAST-NUCES Flex / AMS',
    url: 'https://flex.nu.edu.pk/student/dashboard',
    badge: 'Popular',
    icon: '⚡',
  },
  {
    id: 'nust',
    name: 'NUST CMS / LMS',
    url: 'https://lms.nust.edu.pk',
    badge: 'Moodle',
    icon: '🏛️',
  },
  {
    id: 'iba',
    name: 'IBA Slate LMS',
    url: 'https://slate.iba.edu.pk',
    badge: 'Sakai',
    icon: '📚',
  },
  {
    id: 'moodle',
    name: 'University Moodle',
    url: 'https://moodle.university.edu.pk/my/',
    badge: 'LMS',
    icon: '🎓',
  },
  {
    id: 'gclass',
    name: 'Google Classroom',
    url: 'https://classroom.google.com/u/0/h',
    badge: 'Google',
    icon: '🌐',
  },
];

export default function LmsLogin() {
  const navigate = useNavigate();

  const [portalUrl, setPortalUrl] = useState('https://flex.nu.edu.pk/student/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [syncSteps, setSyncSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (presetUrl: string) => {
    setPortalUrl(presetUrl);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUrl) {
      setError('Please provide your university LMS / AMS portal link.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid university email address.');
      return;
    }
    if (!password) {
      setError('Please enter your portal password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSyncSteps([
        'Connecting to live LMS / AMS portal gateway…',
        `Authenticating student session for ${email}…`,
        'Extracting registered course catalog and active syllabus…',
        'Ingesting lecture slides & assignments into Groq/Gemini RAG…',
        'Finalizing conflict-aware student schedule…',
      ]);

      const res = await api.loginLMS({
        portal_url: portalUrl.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        student_id: studentId.trim() || undefined,
      });

      // Save user session in localStorage
      localStorage.setItem('rahnuma_user', JSON.stringify(res.user));
      localStorage.setItem('rahnuma_token', res.token);

      setSyncSteps((prev) => [
        ...prev,
        `✓ Real-Time Authentication Verified! Welcome ${res.user.name}.`,
      ]);

      setTimeout(() => {
        navigate('/dashboard');
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Portal authentication failed. Please verify your link and credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-primary-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">Rahnuma AI</span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Real-Time Mode
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:flex items-center space-x-2 text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>AI Engine: <strong className="text-white">Groq & Gemini Live</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Hero & Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Real-Time University Connection</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Sign In with Your University LMS / AMS
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Connect your academic portal in real time. Rahnuma AI synchronizes your course syllabus, lecture slides, assignments, and exam dates directly into your personalized AI workspace.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-y-0 space-x-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Direct Real-Time Feed</h4>
                  <p className="text-[11px] text-slate-400">No mock demo profiles. Real courses, real slides, real deadlines.</p>
                </div>
              </div>

              <div className="flex items-start space-y-0 space-x-3">
                <div className="h-6 w-6 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">RAG Grounded Learning</h4>
                  <p className="text-[11px] text-slate-400">Concept Coach & Exam Prep ground every answer in your professor's slides.</p>
                </div>
              </div>

              <div className="flex items-start space-y-0 space-x-3">
                <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Academic Integrity Safeguard</h4>
                  <p className="text-[11px] text-slate-400">Strictly a learning coach and rubric reviewer. We never ghostwrite.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: The Authentication Form */}
          <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-6">
              <div>
                <h2 className="text-lg font-black text-white">Student Portal Authentication</h2>
                <p className="text-xs text-slate-400">Enter your university LMS link and student credentials</p>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Gateway</span>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center space-x-2.5 animate-fadeIn">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Portal Selection Presets */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Quick Select University Portal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PORTAL_PRESETS.map((p) => {
                  const isSelected = portalUrl === p.url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.url)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10 text-white shadow-xs'
                          : 'border-slate-700 bg-slate-900/50 hover:bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base">{p.icon}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-semibold">
                          {p.badge}
                        </span>
                      </div>
                      <span className="text-xs font-bold mt-1.5 truncate w-full">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  LMS / AMS Portal Link (URL)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    required
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    placeholder="https://flex.nu.edu.pk/student/dashboard"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Student University Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. k213054@nu.edu.pk"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Roll No / Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 21K-3054 (auto-derived)"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Portal Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-20 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-primary-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Authenticating Live Portal & Syncing…</span>
                    </>
                  ) : (
                    <>
                      <span>Login & Sync Real-Time</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Progress Terminal */}
            {syncSteps.length > 0 && (
              <div className="mt-5 p-3.5 bg-black/60 rounded-xl border border-slate-700 text-left font-mono text-[11px] text-emerald-400 space-y-1 animate-fadeIn">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                  <span>Fahmly Live Agent Handshake</span>
                  <span className="text-emerald-500">Connected</span>
                </div>
                {syncSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-slate-600">›</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Rahnuma AI • Supervised Multi-Agent Student Guide • Empowered by Groq Cloud & Google Gemini</p>
      </footer>
    </div>
  );
}
