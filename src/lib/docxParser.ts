import mammoth from 'mammoth'

const WORDS_PER_VIRTUAL_PAGE = 500

/**
 * Convert an ArrayBuffer (DOCX file) into virtual HTML pages.
 * Splits at paragraph boundaries every ~500 words so the existing
 * page-based annotation model works without schema changes.
 */
export async function parseDocx(arrayBuffer: ArrayBuffer): Promise<{ pages: string[]; totalPages: number }> {
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value

  // Split on closing paragraph/heading/list tags while preserving the tag
  const blocks = html.split(/(?<=<\/(?:p|h[1-6]|li|blockquote|pre)>)/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)

  const pages: string[] = []
  let currentPageBlocks: string[] = []
  let currentWordCount = 0

  for (const block of blocks) {
    const words = block.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
    currentPageBlocks.push(block)
    currentWordCount += words

    if (currentWordCount >= WORDS_PER_VIRTUAL_PAGE) {
      pages.push(currentPageBlocks.join('\n'))
      currentPageBlocks = []
      currentWordCount = 0
    }
  }

  // Remaining blocks form the last page (may be shorter than 500 words)
  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join('\n'))
  }

  // Guarantee at least one page even for empty/malformed docs
  if (pages.length === 0) {
    pages.push('<p>This document appears to be empty.</p>')
  }

  return { pages, totalPages: pages.length }
}

/**
 * Strip HTML tags to extract plain text for read-aloud / TTS.
 */
export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
