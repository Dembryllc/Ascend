import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))

// Landing
const LandingPage = lazy(() => import('@/pages/LandingPage'))

// Legal
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'))
const PricingPage = lazy(() => import('@/pages/legal/PricingPage'))

// Teacher
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'))
const UploadBookPage = lazy(() => import('@/pages/teacher/UploadBookPage'))
const ClassroomPage = lazy(() => import('@/pages/teacher/ClassroomPage'))
const AnnotationsViewerPage = lazy(() => import('@/pages/teacher/AnnotationsViewerPage'))
const ProgressDashboardPage = lazy(() => import('@/pages/teacher/ProgressDashboardPage'))

// Student
const StudentHome = lazy(() => import('@/pages/student/StudentHome'))
const StudentUploadPage = lazy(() => import('@/pages/student/StudentUploadPage'))
const ReadingPage = lazy(() => import('@/pages/student/ReadingPage'))
const MyAnnotationsPage = lazy(() => import('@/pages/student/MyAnnotationsPage'))
const StudentProgressPage = lazy(() => import('@/pages/student/StudentProgressPage'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#4B5563] text-base">Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
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

            {/* Student + Individual — shared shelf/reading/annotation routes */}
            <Route path="/student" element={<ProtectedRoute requiredRole={['student', 'individual']}><StudentHome /></ProtectedRoute>} />
            <Route path="/student/upload" element={<ProtectedRoute requiredRole={['student', 'individual']}><StudentUploadPage /></ProtectedRoute>} />
            <Route path="/student/read/:bookId" element={<ProtectedRoute requiredRole={['student', 'individual']}><ReadingPage /></ProtectedRoute>} />
            <Route path="/student/annotations" element={<ProtectedRoute requiredRole={['student', 'individual']}><MyAnnotationsPage /></ProtectedRoute>} />
            <Route path="/student/progress" element={<ProtectedRoute requiredRole={['student', 'individual']}><StudentProgressPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
