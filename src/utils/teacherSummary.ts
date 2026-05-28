import type { Annotation, ReactionType } from '@/types'
import { REACTIONS } from '@/types'

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'because', 'before', 'could', 'from', 'have', 'just',
  'like', 'more', 'that', 'the', 'their', 'there', 'this', 'were', 'what', 'when',
  'where', 'which', 'with', 'would', 'your',
])

export function buildAnnotationSummary(annotations: Annotation[]) {
  const reactionCounts = Object.keys(REACTIONS).reduce((acc, key) => {
    acc[key as ReactionType] = 0
    return acc
  }, {} as Record<ReactionType, number>)

  const pageCounts = new Map<number, number>()
  const keywordCounts = new Map<string, number>()
  const questions: Annotation[] = []
  const strongQuotes: Annotation[] = []

  annotations.forEach((ann) => {
    reactionCounts[ann.reactionType] += 1
    pageCounts.set(ann.pageNumber, (pageCounts.get(ann.pageNumber) ?? 0) + 1)
    if (ann.reactionType === 'question') questions.push(ann)
    if (ann.selectedText && ann.annotationKind !== 'reflection') strongQuotes.push(ann)

    const noteText = typeof ann.noteText === 'string' ? ann.noteText : ''
    noteText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4 && !STOP_WORDS.has(word))
      .forEach((word) => keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1))
  })

  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pageNumber, count]) => ({ pageNumber, count }))

  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word)

  const dominantReaction = (Object.entries(reactionCounts) as [ReactionType, number][])
    .sort((a, b) => b[1] - a[1])[0]

  const suggestedPrompt =
    questions.length > 0
      ? 'Start by asking which question felt most important and what evidence might answer it.'
      : strongQuotes.length > 0
        ? 'Ask the student to explain why one highlighted passage stood out.'
        : 'Ask the student to add one quote-based note before the next check-in.'

  return {
    total: annotations.length,
    reactionCounts,
    topPages,
    topKeywords,
    questionCount: questions.length,
    quoteCount: strongQuotes.length,
    dominantReaction: dominantReaction?.[1] ? REACTIONS[dominantReaction[0]].label : 'No pattern yet',
    suggestedPrompt,
  }
}
