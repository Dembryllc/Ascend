import jsPDF from 'jspdf'
import type { Annotation } from '@/types'
import { REACTIONS } from '@/types'

export function exportAnnotationsPDF(
  studentName: string,
  bookTitle: string,
  annotations: Annotation[],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 20
  const pageW = 210
  const lineH = 7
  let y = margin

  function addText(text: string, size: number, bold = false, color = '#1A1D23') {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    doc.setTextColor(r, g, b)
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * lineH
  }

  function checkNewPage(neededSpace = 20) {
    if (y + neededSpace > 280) {
      doc.addPage()
      y = margin
    }
  }

  // Header
  addText('Ascend Annotate — Annotation Report', 20, true, '#4A90D9')
  y += 4
  addText(`Student: ${studentName}`, 13, true)
  addText(`Book: ${bookTitle}`, 13)
  addText(`Generated: ${new Date().toLocaleDateString()}`, 10, false, '#6B7280')
  y += 6

  // Divider
  doc.setDrawColor(200, 210, 230)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  if (annotations.length === 0) {
    addText('No annotations found.', 12, false, '#6B7280')
  }

  annotations.forEach((ann, i) => {
    checkNewPage(30)
    const r = REACTIONS[ann.reactionType]
    addText(`${i + 1}. Page ${ann.pageNumber} — ${r.label}`, 12, true)
    addText(
      `Date: ${ann.timestamp.toLocaleDateString()} ${ann.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      9, false, '#6B7280',
    )
    if (ann.selectedText) {
      y += 2
      addText(`Highlighted: “${ann.selectedText}”`, 10, false, '#4B5563')
    }
    if (ann.noteText) {
      y += 2
      addText(ann.noteText, 11)
    }
    y += 5
  })

  doc.save(`${studentName}_${bookTitle}_annotations.pdf`)
}
