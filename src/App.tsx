import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Teacher
import TeacherDashboard from '@/pages/teacher/TeacherDashboard'
import UploadBookPage from '@/pages/teacher/UploadBookPage'
import ClassroomPage from '@/pages/teacher/ClassroomPage'
import AnnotationsViewerPage from '@/pages/teacher/AnnotationsViewerPage'

// Student — home and upload are lightweight, load eagerly
import StudentHome from '@/pages/student/StudentHome'
import StudentUploadPage from '@/pages/student/StudentUploadPage'
import MyAnnotationsPage from '@/pages/student/MyAnnotationsPage'

// ReadingPage carries the entire PDF.js bundle — lazy load so it only
// downloads when a student actually opens a book, not on the home page.
const ReadingPage = lazy(() => import('@/pages/student/ReadingPage'))

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
      <div className="w-10 h-10 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/upload" element={<ProtectedRoute requiredRole="teacher"><UploadBookPage /></ProtectedRoute>} />
          <Route path="/teacher/classroom" element={<ProtectedRoute requiredRole="teacher"><ClassroomPage /></ProtectedRoute>} />
          <Route path="/teacher/annotations" element={<ProtectedRoute requiredRole="teacher"><AnnotationsViewerPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentHome /></ProtectedRoute>} />
          <Route path="/student/read/:bookId" element={
            <ProtectedRoute requiredRole="student">
              <Suspense fallback={<PageSpinner />}>
                <ReadingPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/student/annotations" element={<ProtectedRoute requiredRole="student"><MyAnnotationsPage /></ProtectedRoute>} />
          <Route path="/student/upload" element={<ProtectedRoute requiredRole="student"><StudentUploadPage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
