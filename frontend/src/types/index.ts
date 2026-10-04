/**
 * Rahnuma AI — Shared Frontend Types
 * Centralized type definitions for user models, courses, assignments,
 * agents (Coach, Planner, Reviewer, Exam Prep, Intake), notifications, and LMS portals.
 */

export type {
  UserSummary,
  UpcomingDeadline,
  UpcomingQuiz,
  AgentActivityTrace,
  NotificationItem,
  DashboardData,
  CourseItem,
  CourseDetail,
  AssignmentItem,
  RubricItem,
  AssignmentDetail,
  MaterialItem,
  SourceCitation,
  CoachChatResponse,
  IntakeExtractResponse,
  IntakeConfirmPayload,
  DailyTaskItem,
  DailyPlanDay,
  StudyPlanResponse,
  RubricFeedbackItem,
  ReviewDraftResponse,
  ExamQuizOption,
  ExamQuizQuestion,
  ExamFlashcard,
  ExamPrepResponse,
  QuizScoreResult,
  SettingsData,
  PortalStudentProfile,
  PortalViewData,
  FreeApisGuide,
} from '../api/client';
