import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Landing
import LandingPage from '@/pages/LandingPage'

// Legal
import PrivacyPage from '@/pages/legal/PrivacyPage'
import TermsPage from '@/pages/legal/TermsPage'
import PricingPage from '@/pages/legal/PricingPage'

// Teacher
import TeacherDashboard from '@/pages/teacher/TeacherDashboard'
import UploadBookPage from '@/pages/teacher/UploadBookPage'
import ClassroomPage from '@/pages/teacher/ClassroomPage'
import AnnotationsViewerPage from '@/pages/teacher/AnnotationsViewerPage'
import ProgressDashboardPage from '@/pages/teacher/ProgressDashboardPage'

// Student
import StudentHome from '@/pages/student/StudentHome'
import StudentUploadPage from '@/pages/student/StudentUploadPage'
import ReadingPage from '@/pages/student/ReadingPage'
import MyAnnotationsPage from '@/pages/student/MyAnnotationsPage'
import StudentProgressPage from '@/pages/student/StudentProgressPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/upload" element={<ProtectedRoute requiredRole="teacher"><UploadBookPage /></ProtectedRoute>} />
          <Route path="/teacher/classroom" element={<ProtectedRoute requiredRole="teacher"><ClassroomPage /></ProtectedRoute>} />
          <Route path="/teacher/annotations" element={<ProtectedRoute requiredRole="teacher"><AnnotationsViewerPage /></ProtectedRoute>} />
          <Route path="/teacher/progress" element={<ProtectedRoute requiredRole="teacher"><ProgressDashboardPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentHome /></ProtectedRoute>} />
          <Route path="/student/upload" element={<ProtectedRoute requiredRole="student"><StudentUploadPage /></ProtectedRoute>} />
          <Route path="/student/read/:bookId" element={<ProtectedRoute requiredRole="student"><ReadingPage /></ProtectedRoute>} />
          <Route path="/student/annotations" element={<ProtectedRoute requiredRole="student"><MyAnnotationsPage /></ProtectedRoute>} />
          <Route path="/student/progress" element={<ProtectedRoute requiredRole="student"><StudentProgressPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
