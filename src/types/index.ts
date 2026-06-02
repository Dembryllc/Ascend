export type UserRole = 'teacher' | 'student'
export type SubscriptionStatus = 'free' | 'pro' | 'district'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  classroomId: string | null
  subscriptionStatus?: SubscriptionStatus
  stripeCustomerId?: string
  trialEndsAt?: Date
  createdAt: Date
}

export function isPro(profile: UserProfile | null | undefined): boolean {
  const s = profile?.subscriptionStatus
  if (s === 'pro' || s === 'district') return true
  if (profile?.trialEndsAt && profile.trialEndsAt > new Date()) return true
  return false
}

export function getTrialDaysRemaining(profile: UserProfile | null | undefined): number | null {
  if (!profile?.trialEndsAt) return null
  if (profile.subscriptionStatus === 'pro' || profile.subscriptionStatus === 'district') return null
  const msRemaining = profile.trialEndsAt.getTime() - Date.now()
  if (msRemaining <= 0) return null
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
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
  assignmentPrompt?: string
  successCriteria?: string
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
  classroomId?: string | null
  pageNumber: number
  reactionType: ReactionType
  noteText: string
  selectedText?: string
  annotationKind?: 'annotation' | 'reflection'
  timestamp: Date
}

export interface ReadingProgress {
  id: string
  studentId: string
  bookId: string
  classroomId?: string | null
  lastReadPage: number
  highestPageRead: number
  totalPages: number
  completionPercent: number
  totalSecondsRead: number
  completed: boolean
  lastReadAt: Date
  createdAt: Date
}

export const REACTIONS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  surprise:  { emoji: '😲', label: 'Surprise',        color: '#F59E0B' },
  think:     { emoji: '🤔', label: 'Makes Me Think',  color: '#6366F1' },
  love:      { emoji: '❤️', label: 'I Love It',       color: '#EC4899' },
  important: { emoji: '⭐', label: 'Important',       color: '#EAB308' },
  question:  { emoji: '❓', label: 'Question',        color: '#3B82F6' },
}
