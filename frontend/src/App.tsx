import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LmsLogin from './pages/LmsLogin';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Planner from './pages/Planner';
import Coach from './pages/Coach';
import Reviewer from './pages/Reviewer';
import ExamPrep from './pages/ExamPrep';
import Materials from './pages/Materials';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import LmsPortal from './pages/LmsPortal';
import Landing from './pages/Landing';

import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const hasUser = !!localStorage.getItem('rahnuma_user');
  if (!hasUser) {
    return <Navigate to="/login" replace />;
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function RootEntry() {
  const hasUser = !!localStorage.getItem('rahnuma_user');
  if (hasUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LmsLogin />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Entry: Prompts LMS / AMS link, Email, Password then logs in real time */}
        <Route path="/" element={<RootEntry />} />
        <Route path="/login" element={<LmsLogin />} />
        <Route path="/lms-login" element={<Navigate to="/login" replace />} />
        <Route path="/landing" element={<Landing />} />

        {/* Student Workspace (Protected Real-Time Routes) */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portal" element={<LmsPortal />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:assignmentId" element={<AssignmentDetail />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/reviewer" element={<Reviewer />} />
          <Route path="/exam-prep" element={<ExamPrep />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/demo" element={<Navigate to="/portal" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
