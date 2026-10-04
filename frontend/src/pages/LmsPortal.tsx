import { useState, useEffect } from 'react';
import {
  Globe,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Calendar,
  Layers,
  Bell,
  PlusCircle,
  Clock,
  Database,
  Lock,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  AlertTriangle,
  ClipboardList,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import type { PortalViewData, PortalSyncResult } from '../api/client';
import { Link } from 'react-router-dom';

/* ─── Types for expanded detail modals ─── */
interface PortalAssignment {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  task_instructions?: string;
  due_at?: string;
  weight?: number;
  estimated_minutes?: number;
  status: string;
  rubric?: Array<{ criterion: string; weight: number; description: string }>;
  requirements?: string[];
}

interface PortalMaterial {
  id: string;
  course_id: string;
  title: string;
  type: string;
  source_url?: string;
  content_text?: string;
}

interface PortalCourse {
  id: string;
  code: string;
  name: string;
  instructor?: string;
  description?: string;
  credits?: number;
  attendance?: string;
  semester?: string;
  is_current?: boolean;
}

export default function LmsPortal() {
  const [portalData, setPortalData] = useState<PortalViewData | null>(null);
  const [viewMode, setViewMode] = useState<'portal' | 'webview'>('portal');
  const [activeTab, setActiveTab] = useState<'courses' | 'assignments' | 'materials' | 'quizzes' | 'announcements' | 'connect'>('courses');
  const [provider, setProvider] = useState<string>('ams_flex');
  const [customUrl, setCustomUrl] = useState<string>('https://flex.nu.edu.pk/student/dashboard');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<PortalSyncResult | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Detail modals
  const [selectedAssignment, setSelectedAssignment] = useState<PortalAssignment | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<PortalMaterial | null>(null);

  // Semester expand state
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

  // Simulation form
  const [simType, setSimType] = useState('new_assignment');
  const [simCourse, setSimCourse] = useState('c1');
  const [simTitle, setSimTitle] = useState('');
  const [simDesc, setSimDesc] = useState('');
  const [simulating, setSimulating] = useState(false);

  // Credentials config
  const [credBaseUrl, setCredBaseUrl] = useState('');
  const [credToken, setCredToken] = useState('');
  const [credStatus, setCredStatus] = useState<string | null>(null);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      const data = await api.getPortalView();
      setPortalData(data);
      setProvider(data.provider);
      setCustomUrl(data.portal_url);
    } catch (err: unknown) {
      console.error('Failed to load portal view', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  // Auto-expand current semester
  useEffect(() => {
    if (portalData) {
      const courses = (portalData.courses || []) as PortalCourse[];
      const semesters = new Set(courses.map(c => c.semester || 'Current Semester'));
      const initial: Record<string, boolean> = {};
      semesters.forEach(s => {
        initial[s] = courses.some(c => c.semester === s && c.is_current);
      });
      // If no current semester found, expand the first one
      if (!Object.values(initial).some(v => v) && semesters.size > 0) {
        initial[Array.from(semesters)[0]] = true;
      }
      setExpandedSemesters(initial);
    }
  }, [portalData]);

  const handleSwitchProvider = async (newProvider: string) => {
    let url = 'https://flex.nu.edu.pk/student/dashboard';
    if (newProvider === 'moodle') url = 'https://moodle.university.edu.pk/my/';
    if (newProvider === 'google_classroom') url = 'https://classroom.google.com/u/0/h';
    if (newProvider === 'custom') url = customUrl;

    setProvider(newProvider);
    setCustomUrl(url);
    try {
      await api.selectPortalProvider(newProvider, url);
      await fetchPortal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRealtimeSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setSyncLogs([
        'Connecting to live portal session...',
        `Authenticating student token for ${portalData?.portal_name || 'Portal'}...`,
        'Crawling registered courses and weekly timetables...',
        'Extracting assignment requirements and due dates...',
        'Ingesting lecture slides and reading packs into RAG vector index...',
        'Triggering conflict-aware study plan recalculation...',
      ]);

      const result = await api.syncPortalRealtime();
      setSyncResult(result);
      setSyncLogs((prev) => [
        ...prev,
        `✓ Sync Complete (${result.duration_ms}ms): ${result.courses_synced} Courses, ${result.assignments_synced} Assignments, ${result.materials_indexed} Materials indexed in RAG!`,
      ]);
      await fetchPortal();
    } catch (err: unknown) {
      setSyncLogs((prev) => [...prev, `❌ Sync Failed: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTitle) return;
    try {
      setSimulating(true);
      await api.simulatePortalEvent({
        event_type: simType,
        course_id: simCourse,
        title: simTitle,
        description: simDesc,
        due_in_days: 4,
      });
      setShowSimulateModal(false);
      setSimTitle('');
      setSimDesc('');
      await fetchPortal();
      // Auto-trigger sync notification
      setSyncLogs((prev) => [
        `[Portal Update Detected] Instructor posted '${simTitle}'. Click 'Sync Real-Time' to ingest into Rahnuma AI.`,
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCredStatus('Verifying token and connecting to LMS endpoint...');
      await api.connectPortalCredentials({
        provider,
        base_url: credBaseUrl,
        api_token: credToken,
      });
      setCredStatus('Connected successfully! Read-only token verified.');
      await fetchPortal();
    } catch (err: unknown) {
      setCredStatus(`Connection failed: ${err instanceof Error ? err.message : 'Invalid credentials'}`);
    }
  };

  const toggleSemester = (semester: string) => {
    setExpandedSemesters(prev => ({ ...prev, [semester]: !prev[semester] }));
  };

  /* Group courses by semester */
  const groupCoursesBySemester = (courses: PortalCourse[]): Record<string, PortalCourse[]> => {
    const groups: Record<string, PortalCourse[]> = {};
    for (const c of courses) {
      const sem = c.semester || 'Current Semester';
      if (!groups[sem]) groups[sem] = [];
      groups[sem].push(c);
    }
    // Sort semesters so current appears first, then descending
    const sorted: Record<string, PortalCourse[]> = {};
    const semesterKeys = Object.keys(groups).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      const aCurrent = groups[a].some(c => c.is_current);
      const bCurrent = groups[b].some(c => c.is_current);
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return bNum - aNum;
    });
    for (const k of semesterKeys) sorted[k] = groups[k];
    return sorted;
  };

  const getCourseName = (courseId: string): string => {
    const c = (portalData?.courses || []).find(c => c.id === courseId);
    return c ? c.code : courseId.toUpperCase();
  };

  /* ─── Loading State ─── */
  if (loading && !portalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <RefreshCw className="h-5 w-5 text-primary-600 animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow" />
        </div>
        <p className="text-gray-700 font-bold mt-4">Connecting to University Portal...</p>
        <p className="text-gray-500 text-sm mt-1">Fetching your courses, assignments, and materials</p>
        <div className="mt-4 flex items-center space-x-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  /* ─── Empty State ─── */
  if (!portalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-900 font-bold">Failed to Load Portal Data</p>
        <p className="text-gray-500 text-sm mt-1">Please check your connection and try again.</p>
        <button
          onClick={fetchPortal}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition"
        >
          <RefreshCw className="h-4 w-4 mr-2 inline" />
          Retry Connection
        </button>
      </div>
    );
  }

  const semesterGroups = groupCoursesBySemester((portalData.courses || []) as PortalCourse[]);

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              <Globe className="h-3 w-3 mr-1 text-blue-600" />
              Live LMS / AMS Real-Time Portal
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Session Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">
            LMS / AMS Real-Time Portal Sync
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View your university Academic Management System in real time. Fahmly monitors and syncs your course catalog, lecture materials, and deadlines into Rahnuma AI.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSimulateModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <PlusCircle className="h-4 w-4 mr-1.5 text-primary-600" />
            Simulate Instructor Post
          </button>

          <button
            onClick={handleRealtimeSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronizing Live...' : '⚡ Sync with Rahnuma AI'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Real-Time Sync Succeeded ({syncResult.duration_ms}ms)
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {syncResult.courses_synced} courses, {syncResult.assignments_synced} assignments, and {syncResult.materials_indexed} lecture slides indexed into RAG.
              </p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {new Date(syncResult.last_sync).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* ─── THE WINDOW SHOWS THE PORTAL ─── */}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-md overflow-hidden">
        {/* Browser Chrome Bar */}
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {/* Window control dots */}
            <div className="flex items-center space-x-1.5 mr-2">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-amber-400"></div>
              <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
            </div>

            {/* Portal selector tabs */}
            <div className="flex items-center bg-gray-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => handleSwitchProvider('ams_flex')}
                className={`px-2.5 py-1 rounded-md transition ${
                  provider === 'ams_flex' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                FAST Flex / AMS
              </button>
              <button
                onClick={() => handleSwitchProvider('moodle')}
                className={`px-2.5 py-1 rounded-md transition ${
                  provider === 'moodle' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Moodle / Slate
              </button>
              <button
                onClick={() => handleSwitchProvider('google_classroom')}
                className={`px-2.5 py-1 rounded-md transition ${
                  provider === 'google_classroom' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Google Classroom
              </button>
              <button
                onClick={() => handleSwitchProvider('custom')}
                className={`px-2.5 py-1 rounded-md transition ${
                  provider === 'custom' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Custom URL
              </button>
            </div>
          </div>

          {/* URL bar */}
          <div className="flex-1 max-w-md mx-2 flex items-center bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 font-mono">
            <Lock className="h-3.5 w-3.5 text-emerald-600 mr-2 flex-shrink-0" />
            <span className="truncate">{customUrl}</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setViewMode('portal')}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === 'portal' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Portal View
              </button>
              <button
                onClick={() => setViewMode('webview')}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === 'webview' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Live Webview
              </button>
            </div>

            <button
              onClick={fetchPortal}
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition"
              title="Reload Portal Frame"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href={customUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition"
              title="Open Portal in New Tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Portal Body or Live Webview */}
        {viewMode === 'webview' ? (
          <div className="bg-slate-100 flex flex-col">
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-amber-700 flex-shrink-0" />
                <span>
                  Displaying live university portal at <code className="font-mono bg-amber-100/70 px-1.5 py-0.5 rounded text-[11px] font-bold">{customUrl}</code>.
                </span>
              </div>
              <a
                href={customUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-bold text-amber-950 hover:underline flex-shrink-0"
              >
                Open in New Window <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
            <iframe
              src={customUrl}
              title="University LMS / AMS Portal Webview"
              className="w-full h-[650px] border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="p-6 bg-slate-50 min-h-[500px]">
          {/* Authentic Student Portal Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-xl">
                  {portalData?.student?.student_id ? portalData.student.student_id.slice(0, 3) : 'AMS'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-blue-300">
                      {portalData?.portal_name || 'University Portal'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {portalData?.student?.fee_status || 'Verified'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-0.5">
                    {portalData?.student?.name || 'Student'} ({portalData?.student?.student_id || 'ID'})
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {portalData?.student?.degree || 'BS Artificial Intelligence'} • {portalData?.student?.semester || 'Semester 5'} • {portalData?.student?.campus || 'Main Campus'}
                  </p>
                </div>
              </div>

              {/* Quick stats on student portal */}
              <div className="grid grid-cols-3 gap-3 bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">CGPA</span>
                  <span className="text-lg font-black text-white">{portalData?.student?.cgpa || '2.83'}</span>
                </div>
                <div className="border-x border-white/10 px-3">
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Credits</span>
                  <span className="text-lg font-black text-white">{portalData?.student?.credit_hours || 78}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Attendance</span>
                  <span className="text-lg font-black text-emerald-400">92.4%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Internal Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6 bg-white rounded-xl p-1 shadow-xs space-x-1">
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'courses' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Registered Courses ({portalData?.courses?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'assignments' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Assignments ({portalData?.assignments?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'materials' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Lecture Slides ({portalData?.materials?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'quizzes' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Exams & Quizzes ({portalData?.quizzes?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'announcements' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Notice Board ({portalData?.announcements?.length ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('connect')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'connect' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>External API</span>
            </button>
          </div>

          {/* ═══════ TAB 1: Registered Courses — Grouped by Semester Cards ═══════ */}
          {activeTab === 'courses' && (
            <div className="space-y-5">
              {Object.entries(semesterGroups).map(([semester, courses]) => {
                const isCurrent = courses.some(c => c.is_current);
                const isExpanded = expandedSemesters[semester] ?? isCurrent;
                return (
                  <div
                    key={semester}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      isCurrent
                        ? 'border-primary-300 bg-primary-50/30 shadow-sm'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Semester Header — Clickable to expand/collapse */}
                    <button
                      onClick={() => toggleSemester(semester)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isCurrent
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          S{semester.replace(/\D/g, '') || '?'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-black text-gray-900">{semester}</h3>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 border border-primary-200">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {courses.length} course{courses.length !== 1 ? 's' : ''} registered
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* Courses Grid */}
                    {isExpanded && (
                      <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.map((course) => (
                          <div key={course.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-primary-300 hover:shadow-md transition group cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {course.code}
                              </span>
                              <span className="text-[11px] text-gray-500 font-semibold">{course.credits || 3} Credit Hours</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mt-2 text-sm group-hover:text-primary-700 transition">{course.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Instructor: {course.instructor || 'Faculty'}</p>
                            {course.description && (
                              <p className="text-xs text-gray-400 mt-2 line-clamp-2">{course.description}</p>
                            )}

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                              <span className="text-gray-500">Attendance:</span>
                              <span className="font-bold text-emerald-600">{course.attendance || '90%'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(semesterGroups).length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No courses found. Sync your portal to load courses.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB 2: Assignments — Clickable for Full Details ═══════ */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              {(portalData?.assignments as PortalAssignment[])?.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => setSelectedAssignment(assignment)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-primary-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                          {getCourseName(assignment.course_id)}
                        </span>
                        <span className="text-xs font-bold text-gray-900 group-hover:text-primary-700 transition">{assignment.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          assignment.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : assignment.status === 'overdue'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-xl line-clamp-2">{assignment.description || assignment.task_instructions}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        {assignment.due_at && (
                          <p className="text-[11px] text-red-600 font-semibold flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {new Date(assignment.due_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {assignment.weight && (
                          <span className="text-[11px] text-gray-500">Weight: {assignment.weight}%</span>
                        )}
                        {assignment.estimated_minutes && (
                          <span className="text-[11px] text-gray-500">Est. {assignment.estimated_minutes}m</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold group-hover:bg-blue-100 transition flex items-center">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View Details
                      </span>
                      <Link
                        to={`/reviewer`}
                        onClick={e => e.stopPropagation()}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition"
                      >
                        Draft Reviewer
                      </Link>
                      <Link
                        to={`/coach`}
                        onClick={e => e.stopPropagation()}
                        className="px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs font-bold hover:bg-primary-100 transition"
                      >
                        Ask Coach
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {(!portalData?.assignments || portalData.assignments.length === 0) && (
                <div className="text-center py-12">
                  <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No assignments posted yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB 3: Materials — Clickable for Full Content ═══════ */}
          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(portalData?.materials as PortalMaterial[])?.map((mat) => (
                <div
                  key={mat.id}
                  onClick={() => setSelectedMaterial(mat)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-primary-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs uppercase border border-red-100">
                        {mat.type}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-primary-700 transition truncate">{mat.title}</h4>
                        <p className="text-[11px] text-gray-500">{getCourseName(mat.course_id)} • Indexed for RAG Retrieval</p>
                        {mat.content_text && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{mat.content_text.slice(0, 100)}...</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        RAG Ready
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold group-hover:bg-blue-100 transition flex items-center">
                        <Eye className="h-3 w-3 mr-0.5" />
                        Open
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!portalData?.materials || portalData.materials.length === 0) && (
                <div className="col-span-2 text-center py-12">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No lecture materials uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Exams & Quizzes */}
          {activeTab === 'quizzes' && (
            <div className="space-y-3">
              {(portalData?.quizzes || []).map((quiz, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {quiz.course_id.toUpperCase()}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">{quiz.title}</h4>
                    {quiz.topic && <p className="text-xs text-gray-500 mt-0.5">Topic: {quiz.topic}</p>}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600 block">
                      {quiz.quiz_date ? new Date(quiz.quiz_date).toLocaleDateString() : 'Upcoming'}
                    </span>
                    <Link
                      to="/exam-prep"
                      className="inline-flex items-center text-xs font-bold text-primary-600 hover:text-primary-700 mt-1"
                    >
                      Generate Prep Quiz <ArrowUpRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
              {(!portalData?.quizzes || portalData.quizzes.length === 0) && (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No exams or quizzes scheduled.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Announcements */}
          {activeTab === 'announcements' && (
            <div className="space-y-3">
              {(portalData?.announcements || []).map((ann) => (
                <div key={ann.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                      {ann.course_id.toUpperCase()} Notice
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {ann.posted_at ? new Date(ann.posted_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-1.5">{ann.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ann.content}</p>
                </div>
              ))}
              {(!portalData?.announcements || portalData.announcements.length === 0) && (
                <div className="text-center py-12">
                  <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No announcements posted.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: External Live Moodle / Classroom Credentials */}
          {activeTab === 'connect' && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-xl mx-auto space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Connect University LMS API Directly</h3>
                <p className="text-xs text-gray-500 mt-1">
                  If your university provides Moodle Web Services API tokens or Google Classroom OAuth, enter them here for automatic read-only pulls.
                </p>
              </div>

              {credStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
                  {credStatus}
                </div>
              )}

              <form onSubmit={handleSaveCredentials} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Moodle / LMS Base URL</label>
                  <input
                    type="url"
                    value={credBaseUrl}
                    onChange={(e) => setCredBaseUrl(e.target.value)}
                    placeholder="https://moodle.your-university.edu.pk"
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Web Service API Token / Session Key</label>
                  <input
                    type="password"
                    value={credToken}
                    onChange={(e) => setCredToken(e.target.value)}
                    placeholder="e.g. 8f4b6a9e1c2d3e4f5a6b7c8d9e0f1a2b"
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Save & Authenticate Live API
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

        {/* Live Fahmly Sync Terminal / Event Stream */}
        {syncLogs.length > 0 && (
          <div className="bg-slate-900 text-emerald-400 p-4 border-t border-slate-800 font-mono text-xs max-h-44 overflow-y-auto">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1 mb-2 text-[10px] uppercase font-bold tracking-wider">
              <span>Fahmly LMS Agent Live Sync Stream</span>
              <span>Real-Time Ingestion</span>
            </div>
            {syncLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ ASSIGNMENT DETAIL MODAL ═══════ */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAssignment(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                    {getCourseName(selectedAssignment.course_id)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedAssignment.status === 'submitted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedAssignment.status === 'overdue'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedAssignment.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-gray-900">{selectedAssignment.title}</h2>
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-xs">
              {selectedAssignment.due_at && (
                <div className="flex items-center space-x-1 text-red-600 font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due: {new Date(selectedAssignment.due_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {selectedAssignment.weight && (
                <span className="text-gray-600">Weight: <strong>{selectedAssignment.weight}%</strong></span>
              )}
              {selectedAssignment.estimated_minutes && (
                <span className="text-gray-600">Estimated: <strong>{selectedAssignment.estimated_minutes} mins</strong></span>
              )}
            </div>

            {/* Task Instructions / Description */}
            <div className="bg-slate-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                Task Instructions from Instructor
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedAssignment.task_instructions || selectedAssignment.description || 'No detailed instructions available.'}
              </p>
            </div>

            {/* Requirements */}
            {selectedAssignment.requirements && selectedAssignment.requirements.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center">
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  Requirements
                </h3>
                <ul className="space-y-2">
                  {selectedAssignment.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                      <span className="h-5 w-5 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rubric */}
            {selectedAssignment.rubric && selectedAssignment.rubric.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  Grading Rubric
                </h3>
                <div className="space-y-2">
                  {selectedAssignment.rubric.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{item.criterion}</span>
                        <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                          {item.weight}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
              <Link
                to="/reviewer"
                onClick={() => setSelectedAssignment(null)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold text-center transition"
              >
                Start Draft Reviewer
              </Link>
              <Link
                to="/coach"
                onClick={() => setSelectedAssignment(null)}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold text-center transition"
              >
                Ask Concept Coach
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MATERIAL DETAIL MODAL ═══════ */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedMaterial(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm uppercase border border-red-200">
                  {selectedMaterial.type}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                      {getCourseName(selectedMaterial.course_id)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      RAG Indexed
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900">{selectedMaterial.title}</h2>
                </div>
              </div>
              <button onClick={() => setSelectedMaterial(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Source URL */}
            {selectedMaterial.source_url && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Source:</span>
                <a href={selectedMaterial.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold hover:underline flex items-center">
                  {selectedMaterial.source_url}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {/* Content */}
            <div className="bg-slate-50 rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                Material Content
              </h3>
              {selectedMaterial.content_text ? (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-light">
                  {selectedMaterial.content_text}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Content preview not available for this file type.</p>
                  {selectedMaterial.source_url && (
                    <a href={selectedMaterial.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 font-bold hover:underline mt-2 inline-flex items-center">
                      Download Original File <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
              <Link
                to="/coach"
                onClick={() => setSelectedMaterial(null)}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold text-center transition"
              >
                Ask Coach About This Material
              </Link>
              <Link
                to="/exam-prep"
                onClick={() => setSelectedMaterial(null)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition"
              >
                Generate Quiz from This
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal (Instructor Post Simulation) */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Simulate University Portal Update</h3>
              <button onClick={() => setShowSimulateModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Simulates a faculty member posting a new assignment or lecture notes on the portal. Fahmly will detect the update in real time.
            </p>

            <form onSubmit={handleSimulateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event Type</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                >
                  <option value="new_assignment">New Assignment Posted</option>
                  <option value="new_material">New Lecture Slides / Reading Uploaded</option>
                  <option value="new_announcement">Faculty Urgent Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Course</label>
                <select
                  value={simCourse}
                  onChange={(e) => setSimCourse(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                >
                  {(portalData?.courses || []).map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                  {(!portalData?.courses || portalData.courses.length === 0) && (
                    <>
                      <option value="c1">CS3002 — Database Systems</option>
                      <option value="c2">CS3005 — Software Engineering</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assignment 3: B-Tree Indexing Implementation"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Content / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide assignment brief or lecture notes..."
                  value={simDesc}
                  onChange={(e) => setSimDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {simulating ? 'Posting...' : 'Post to Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
