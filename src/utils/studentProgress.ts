import type { Annotation, Book, ReadingProgress, ReactionType } from '@/types'

const WEEKLY_PAGE_GOAL = 5

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function startOfWeek() {
  const today = startOfToday()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  today.setDate(today.getDate() - diff)
  return today
}

function getAnnotationBookId(annotation: Annotation) {
  return annotation.bookId
}

export interface StudentProgressSummary {
  booksInShelf: number
  annotationsCount: number
  pagesAnnotated: number
  pagesAnnotatedThisWeek: number
  minutesRead: number
  completedBooks: number
  booksInProgress: number
  weeklyPageGoal: number
  weeklyGoalPercent: number
  streakDays: number
  annotatedBookCount: number
  reactionCounts: Record<ReactionType, number>
  topReaction: ReactionType | null
  recentAnnotations: Annotation[]
  nextBook: Book | null
  nextActionLabel: string
  nextActionDetail: string
}

export function buildStudentProgressSummary(
  books: Book[],
  annotations: Annotation[],
  readingProgress: ReadingProgress[] = [],
): StudentProgressSummary {
  const sortedAnnotations = [...annotations].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const sortedProgress = [...readingProgress].sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
  const pages = new Set(sortedAnnotations.map((a) => `${a.bookId}:${a.pageNumber}`))
  const annotatedBooks = new Set(sortedAnnotations.map(getAnnotationBookId))
  const activeProgress = sortedProgress.filter((progress) => books.some((book) => book.id === progress.bookId))
  const weekStart = startOfWeek()
  const pagesThisWeek = new Set(
    sortedAnnotations
      .filter((a) => a.timestamp >= weekStart)
      .map((a) => `${a.bookId}:${a.pageNumber}`),
  )

  const reactionCounts = sortedAnnotations.reduce(
    (counts, annotation) => {
      counts[annotation.reactionType] += 1
      return counts
    },
    {
      surprise: 0,
      think: 0,
      love: 0,
      important: 0,
      question: 0,
    } satisfies Record<ReactionType, number>,
  )

  const topReaction = (Object.entries(reactionCounts) as [ReactionType, number][])
    .sort((a, b) => b[1] - a[1])[0]

  const annotationDays = new Set(sortedAnnotations.map((a) => dateKey(a.timestamp)))
  const today = startOfToday()
  let streakDays = 0

  for (let cursor = new Date(today); annotationDays.has(dateKey(cursor)); cursor.setDate(cursor.getDate() - 1)) {
    streakDays += 1
  }

  const mostRecentAnnotation = sortedAnnotations[0]
  const mostRecentProgress = activeProgress[0]
  const completedBookIds = new Set(activeProgress.filter((progress) => progress.completed).map((progress) => progress.bookId))
  const inProgressBookIds = new Set(activeProgress.filter((progress) => !progress.completed && progress.completionPercent > 0).map((progress) => progress.bookId))
  const unstartedBook = books.find((book) => !annotatedBooks.has(book.id) && !inProgressBookIds.has(book.id) && !completedBookIds.has(book.id)) ?? null
  const lastAnnotatedBook = mostRecentAnnotation
    ? books.find((book) => book.id === mostRecentAnnotation.bookId) ?? null
    : null
  const lastReadBook = mostRecentProgress
    ? books.find((book) => book.id === mostRecentProgress.bookId) ?? null
    : null
  const nextBook = lastReadBook && !mostRecentProgress?.completed
    ? lastReadBook
    : unstartedBook ?? lastAnnotatedBook ?? books.find((book) => !completedBookIds.has(book.id)) ?? books[0] ?? null

  let nextActionLabel = 'Add a book'
  let nextActionDetail = 'Build your shelf, then start annotating as you read.'

  if (nextBook && mostRecentProgress && nextBook.id === mostRecentProgress.bookId && !mostRecentProgress.completed) {
    nextActionLabel = 'Keep reading'
    nextActionDetail = `Pick up ${nextBook.title} on page ${mostRecentProgress.lastReadPage}.`
  } else if (nextBook && unstartedBook) {
    nextActionLabel = 'Start annotating'
    nextActionDetail = `${nextBook.title} is ready for your first note.`
  } else if (nextBook && mostRecentAnnotation) {
    nextActionLabel = 'Continue reading'
    nextActionDetail = `Pick up ${nextBook.title} around page ${mostRecentAnnotation.pageNumber}.`
  } else if (nextBook) {
    nextActionLabel = 'Open a book'
    nextActionDetail = `${nextBook.title} is ready when you are.`
  }

  return {
    booksInShelf: books.length,
    annotationsCount: sortedAnnotations.length,
    pagesAnnotated: pages.size,
    pagesAnnotatedThisWeek: pagesThisWeek.size,
    minutesRead: Math.round(activeProgress.reduce((sum, progress) => sum + progress.totalSecondsRead, 0) / 60),
    completedBooks: completedBookIds.size,
    booksInProgress: inProgressBookIds.size,
    weeklyPageGoal: WEEKLY_PAGE_GOAL,
    weeklyGoalPercent: Math.min(100, Math.round((pagesThisWeek.size / WEEKLY_PAGE_GOAL) * 100)),
    streakDays,
    annotatedBookCount: annotatedBooks.size,
    reactionCounts,
    topReaction: topReaction && topReaction[1] > 0 ? topReaction[0] : null,
    recentAnnotations: sortedAnnotations.slice(0, 3),
    nextBook,
    nextActionLabel,
    nextActionDetail,
  }
}
