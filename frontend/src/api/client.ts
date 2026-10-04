/**
 * Rahnuma AI — Unified Frontend API Client
 * Provides typed endpoints for all agents, LMS sync, data reads, and study plans.
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export interface UpcomingDeadline {
  id: number;
  title: string;
  course_code: string;
  due_at: string | null;
  estimated_minutes: number | null;
  weight: number | null;
}

export interface UpcomingQuiz {
  title: string | null;
  course_code: string | null;
  quiz_date: string | null;
}

export interface AgentActivityTrace {
  id: number;
  agent: string;
  action: string;
  status: 'success' | 'error' | 'blocked';
  duration_ms: number | null;
  timestamp: string | null;
  summary: string;
}

export interface NotificationItem {
  id: number;
  type: 'deadline' | 'portal' | 'system' | 'agent' | 'quiz' | string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export interface DashboardData {
  user: UserSummary;
  lms_status: string;
  provider?: string;
  portal_name?: string;
  portal_url?: string;
  last_sync: string | null;
  course_count: number;
  total_course_count?: number;
  current_semester?: string;
  tasks_due_this_week: number;
  upcoming_deadlines: UpcomingDeadline[];
  upcoming_quiz: UpcomingQuiz | null;
  recent_activity: AgentActivityTrace[];
}

export interface CourseItem {
  id: number;
  lms_course_id: string;
  name: string;
  code: string;
  instructor: string | null;
  description: string | null;
  semester?: string;
  is_current?: boolean;
  assignment_count: number;
  material_count: number;
}

export interface CourseDetail {
  id: number;
  name: string;
  code: string;
  instructor: string | null;
  description: string | null;
  semester?: string;
  is_current?: boolean;
  assignments: Array<{
    id: number;
    title: string;
    due_at: string | null;
    weight: number | null;
    status: string;
    estimated_minutes: number | null;
    task_instructions?: string;
  }>;
  materials: Array<{
    id: number;
    title: string;
    type: string;
    source_url?: string;
    content_text?: string;
  }>;
  announcements: Array<{
    id: number;
    title: string;
    content: string | null;
    posted_at: string | null;
  }>;
  quizzes: Array<{
    id: number;
    title: string;
    topic: string | null;
    quiz_date: string | null;
  }>;
}

export interface AssignmentItem {
  id: number;
  title: string;
  course_code: string;
  course_name: string;
  due_at: string | null;
  weight: number | null;
  status: string;
  estimated_minutes: number | null;
  confirmed: boolean;
  description?: string;
  task_instructions?: string;
  semester?: string;
  is_current?: boolean;
}

export interface RubricItem {
  criterion: string;
  points: number;
  description: string;
}

export interface AssignmentDetail {
  id: number;
  title: string;
  course_code: string;
  course_name: string;
  description: string | null;
  task_instructions?: string | null;
  semester?: string;
  due_at: string | null;
  weight: number | null;
  status: string;
  estimated_minutes: number | null;
  rubric: RubricItem[];
  requirements: string[];
  confirmed: boolean;
  related_materials: Array<{ id: number; title: string; type: string; source_url?: string; content_text?: string }>;
}

export interface MaterialItem {
  id: number;
  title: string;
  type: string;
  course_code: string;
  course_name: string;
  semester?: string;
  is_current?: boolean;
  source_url?: string;
  content_text?: string;
  indexed: boolean;
}

// Concept Coach Types
export interface SourceCitation {
  title: string;
  course: string;
  page_section?: string | null;
}

export interface CoachChatResponse {
  concept: string;
  simple_explanation: string;
  course_connection: string;
  similar_example: string;
  common_mistakes: string;
  practice_question: string;
  sources: SourceCitation[];
  is_academic_integrity_flag: boolean;
  refusal_reason?: string | null;
}

// Intake Agent Types
export interface IntakeExtractResponse {
  assignment_id: number | null;
  title: string;
  due_at: string | null;
  weight: number | null;
  estimated_minutes: number;
  format_requirements: string;
  requirements: string[];
  constraints: string[];
  citation_requirements: string[];
  rubric: RubricItem[];
}

export interface IntakeConfirmPayload {
  assignment_id: number;
  title: string;
  due_at?: string | null;
  estimated_minutes: number;
  weight?: number | null;
  requirements: string[];
  constraints?: string[];
  citation_requirements?: string[];
  rubric?: RubricItem[];
}

// Planner Types
export interface DailyTaskItem {
  id: string;
  assignment_id: number;
  title: string;
  course_code: string;
  allocated_minutes: number;
  completed: boolean;
  due_date_str?: string | null;
}

export interface DailyPlanDay {
  date: string;
  day_name: string;
  total_minutes: number;
  is_overloaded: boolean;
  tasks: DailyTaskItem[];
}

export interface StudyPlanResponse {
  plan_id?: number | null;
  daily_capacity_minutes: number;
  total_scheduled_minutes: number;
  conflicts: string[];
  warnings: string[];
  reasoning_summary: string;
  days: DailyPlanDay[];
}

// Reviewer Types
export interface RubricFeedbackItem {
  criterion: string;
  status: 'Exceeds Expectations' | 'On Track' | 'Needs Work';
  evidence: string;
  feedback: string;
  suggested_improvement: string;
}

export interface ReviewDraftResponse {
  draft_id: number;
  assignment_title: string;
  course_code: string;
  rubric_feedback: RubricFeedbackItem[];
  estimated_range: string;
  coaching_note: string;
}

// Exam Prep Types
export interface ExamQuizOption {
  id: string;
  text: string;
}

export interface ExamQuizQuestion {
  id: string;
  type: string;
  question: string;
  options?: ExamQuizOption[] | null;
  correct_answer: string;
  explanation: string;
  source_title: string;
}

export interface ExamFlashcard {
  question: string;
  answer: string;
  source_title: string;
}

export interface ExamPrepResponse {
  quiz_id?: number | null;
  course_code: string;
  topic: string;
  difficulty: string;
  quiz_questions: ExamQuizQuestion[];
  flashcards: ExamFlashcard[];
  weak_areas_identified: string[];
  revision_schedule: string[];
}

export interface QuizScoreResult {
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  passed: boolean;
  breakdown: Array<{
    question_id: string;
    question: string;
    selected_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    source_title: string;
  }>;
  weak_areas: string[];
  coaching_advice: string;
}

export interface SettingsData {
  user_name: string;
  email: string;
  timezone: string;
  study_hours_per_day: number;
  lms_provider: string;
  lms_status: string;
  last_sync: string | null;
}

export interface PortalStudentProfile {
  student_id: string;
  name: string;
  email: string;
  degree: string;
  campus: string;
  semester: string;
  cgpa: string;
  credit_hours: number;
  fee_status: string;
  portal_name: string;
  portal_url: string;
}

export interface PortalViewData {
  provider: string;
  portal_name: string;
  portal_url: string;
  student: PortalStudentProfile;
  courses: Array<{
    id: string;
    code: string;
    name: string;
    instructor?: string;
    description?: string;
    credits?: number;
    attendance?: string;
    semester?: string;
    is_current?: boolean;
  }>;
  assignments: Array<{
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
  }>;
  materials: Array<{
    id: string;
    course_id: string;
    title: string;
    type: string;
    source_url?: string;
    content_text?: string;
  }>;
  announcements: Array<{
    id: string;
    course_id: string;
    title: string;
    content?: string;
    posted_at?: string;
  }>;
  quizzes: Array<{
    id?: string;
    course_id: string;
    title: string;
    topic?: string;
    quiz_date?: string;
  }>;
  recent_changes: Array<{
    type: string;
    title: string;
    course_id: string;
    timestamp: string;
    description: string;
  }>;
  last_sync: string | null;
}

export interface PortalSyncResult {
  status: string;
  portal_name: string;
  portal_url: string;
  duration_ms: number;
  courses_synced: number;
  assignments_synced: number;
  materials_indexed: number;
  announcements_synced: number;
  quizzes_synced: number;
  last_sync: string;
}

export interface MaterialDetail {
  id: number;
  title: string;
  course_code: string;
  course_name: string;
  type: string;
  source_url: string | null;
  content_text: string | null;
  indexed: boolean;
}

export interface RAGSearchResult {
  query: string;
  total_results: number;
  results: Array<{
    content: string;
    metadata: {
      material_id: string;
      course_id: string;
      course_code?: string;
      title: string;
      chunk_index: number;
    };
    score: number;
  }>;
}

export interface RAGStats {
  total_chunks: number;
  indexed_materials: number;
  courses_covered: number;
  backend: string;
}

export interface FreeApisGuide {
  current_status: {
    gemini_configured: boolean;
    mode: string;
  };
  free_providers: Array<{
    name: string;
    recommended: boolean;
    url: string;
    cost: string;
    models: string[];
    best_for: string;
    setup_time: string;
  }>;
}

// ============================================================================
// API Helper
// ============================================================================

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  let authHeaders: Record<string, string> = {};
  const storedUser = localStorage.getItem('rahnuma_user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.email) authHeaders['X-User-Email'] = parsed.email;
      if (parsed.id) authHeaders['X-User-Id'] = String(parsed.id);
    } catch {
      // ignore
    }
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errMessage = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Exported API Methods
// ============================================================================

export const api = {
  // Read Data
  getDashboard: () => request<DashboardData>('/dashboard'),
  getCourses: () => request<CourseItem[]>('/courses'),
  getCourse: (courseId: number) => request<CourseDetail>(`/courses/${courseId}`),
  getAssignments: () => request<AssignmentItem[]>('/assignments'),
  getAssignment: (assignmentId: number) => request<AssignmentDetail>(`/assignments/${assignmentId}`),
  getMaterials: () => request<MaterialItem[]>('/materials'),
  getMaterialDetail: (materialId: number) => request<MaterialDetail>(`/materials/${materialId}`),
  getMaterialDownloadUrl: (materialId: number) => `${API_BASE}/materials/${materialId}/download`,
  uploadMaterial: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/materials/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  getTraces: () => request<AgentActivityTrace[]>('/traces'),

  // RAG Search & Knowledge
  searchRAG: (query: string, courseId?: number, topK = 5) =>
    request<RAGSearchResult>('/rag/search', {
      method: 'POST',
      body: JSON.stringify({ query, course_id: courseId, top_k: topK }),
    }),
  getRAGStats: () => request<RAGStats>('/rag/stats'),

  // LMS / AMS Portal Real-Time Window
  getPortalView: () => request<PortalViewData>('/portal/view'),
  selectPortalProvider: (provider: string, portalUrl?: string, studentId?: string) =>
    request<{ status: string; provider: string; portal_name: string }>('/portal/select-provider', {
      method: 'POST',
      body: JSON.stringify({ provider, portal_url: portalUrl, student_id: studentId }),
    }),
  syncPortalRealtime: () => request<PortalSyncResult>('/portal/sync', { method: 'POST' }),
  simulatePortalEvent: (payload: { event_type: string; course_id: string; title: string; description?: string; due_in_days?: number }) =>
    request<{ status: string; event: string; data: any }>('/portal/simulate-event', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPortalChanges: () => request<{ changes: any[]; unread_count: number }>('/portal/changes'),
  connectPortalCredentials: (payload: { provider: string; base_url?: string; api_token?: string; username?: string; password?: string }) =>
    request<{ status: string; message: string }>('/portal/connect-credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Legacy LMS
  syncLMS: () => request<{ status: string; duration_ms: number }>('/lms/sync', { method: 'POST' }),
  connectLMS: (provider = 'demo') => request<{ status: string; provider: string }>(`/lms/connect?provider=${provider}`, { method: 'POST' }),
  disconnectLMS: () => request<{ status: string }>('/lms/disconnect', { method: 'POST' }),

  // Concept Coach (supports language toggle)
  askCoach: (query: string, courseId?: number, language = 'en') =>
    request<CoachChatResponse>('/coach/chat', {
      method: 'POST',
      body: JSON.stringify({ query, course_id: courseId, language }),
    }),

  // Intake Agent
  extractIntake: (assignmentId?: number, rawText?: string) =>
    request<IntakeExtractResponse>('/intake/extract', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, raw_text: rawText }),
    }),
  confirmIntake: (payload: IntakeConfirmPayload) =>
    request<{ status: string; assignment_id: number; message: string }>('/intake/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Planner Agent
  getStudyPlan: () => request<StudyPlanResponse>('/planner/plan'),
  generateStudyPlan: (dailyAvailabilityHours = 3) =>
    request<StudyPlanResponse>('/planner/generate', {
      method: 'POST',
      body: JSON.stringify({ daily_availability_hours: dailyAvailabilityHours }),
    }),
  togglePlanTask: (taskId: string) =>
    request<{ status: string; task_id: string }>(`/planner/tasks/${taskId}/toggle`, {
      method: 'POST',
    }),
  getExportIcsUrl: () => `${API_BASE}/planner/export-ics`,

  // Draft Reviewer & Draft Stager
  analyzeDraft: (assignmentId: number, draftText: string, confirmedOwnership: boolean) =>
    request<ReviewDraftResponse>('/reviewer/analyze', {
      method: 'POST',
      body: JSON.stringify({
        assignment_id: assignmentId,
        draft_text: draftText,
        confirmed_ownership: confirmedOwnership,
      }),
    }),
  stageDraft: (assignmentId: number, draftText: string, filename?: string) =>
    request<{
      status: string;
      message: string;
      assignment_title: string;
      course_code: string;
      filename: string;
      requires_manual_submit: boolean;
      instructions: string;
    }>('/reviewer/stage-draft', {
      method: 'POST',
      body: JSON.stringify({
        assignment_id: assignmentId,
        draft_text: draftText,
        filename,
      }),
    }),

  // Exam Prep
  generateExamPrep: (courseId: number, topic: string, difficulty = 'Medium', questionCount = 5) =>
    request<ExamPrepResponse>('/exam-prep/generate', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        topic,
        difficulty,
        question_count: questionCount,
      }),
    }),
  submitQuiz: (quizId: number | null, answers: Record<string, string>) =>
    request<QuizScoreResult>('/exam-prep/submit', {
      method: 'POST',
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
      }),
    }),

  // Settings & Free APIs
  getSettings: () => request<SettingsData>('/settings'),
  updateSettings: (payload: { user_name?: string; timezone?: string }) =>
    request<{ status: string }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  resetDemoData: () => request<{ status: string }>('/settings/reset-demo', { method: 'POST' }),
  configureGeminiKey: (apiKey: string) =>
    request<{ configured: boolean; is_available: boolean; test: { valid: boolean; message: string; response?: string } }>('/settings/gemini-key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
  getFreeApisGuide: () => request<FreeApisGuide>('/settings/free-apis'),

  // Notifications
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  markNotificationRead: (id: number) =>
    request<NotificationItem>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ status: string; updated_count: number }>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: number) =>
    request<{ status: string; id: number }>(`/notifications/${id}`, { method: 'DELETE' }),
  clearNotifications: () =>
    request<{ status: string }>('/notifications', { method: 'DELETE' }),

  // Authentication & Real-Time LMS Login
  loginLMS: (payload: { portal_url: string; email: string; password: string; student_id?: string }) =>
    request<{
      status: string;
      message: string;
      token: string;
      user: {
        id: number;
        name: string;
        email: string;
        student_id: string;
        portal_name: string;
        portal_url: string;
        degree?: string;
        campus?: string;
      };
    }>('/auth/lms-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAuthMe: () =>
    request<{
      id: number;
      name: string;
      email: string;
      student_id: string;
      portal_name: string;
      portal_url: string;
      lms_status: string;
      last_sync: string | null;
    }>('/auth/me'),
  logout: () => {
    localStorage.removeItem('rahnuma_user');
    localStorage.removeItem('rahnuma_token');
    return request<{ status: string }>('/auth/logout', { method: 'POST' });
  },
};

