export type UserRole = 'teacher' | 'student'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  classroomId: string | null
  createdAt: Date
}

export interface Classroom {
  id: string
  name: string
  teacherId: string
  joinCode: string
  studentIds: string[]
  createdAt: Date
}

export interface Book {
  id: string
  title: string
  author: string
  readingLevel?: string
  storageUrl: string
  uploadedBy: string
  assignedStudentIds: string[]
  coverUrl?: string
  createdAt: Date
}

export type ReactionType = 'surprise' | 'think' | 'love' | 'important' | 'question'

export interface Annotation {
  id: string
  studentId: string
  bookId: string
  pageNumber: number
  reactionType: ReactionType
  noteText: string
  selectedText?: string
  timestamp: Date
}

export const REACTIONS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  surprise:  { emoji: '😲', label: 'Surprise',        color: '#F59E0B' },
  think:     { emoji: '🤔', label: 'Makes Me Think',  color: '#6366F1' },
  love:      { emoji: '❤️', label: 'I Love It',       color: '#EC4899' },
  important: { emoji: '⭐', label: 'Important',       color: '#EAB308' },
  question:  { emoji: '❓', label: 'Question',        color: '#3B82F6' },
}
