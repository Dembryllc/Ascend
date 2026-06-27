import jsPDF from 'jspdf'
import type { OrganizerResponse } from '@/types'
import { ORGANIZER_TEMPLATES } from '@/data/organizerTemplates'

export function exportOrganizerPDF(
  studentName: string,
  bookTitle: string,
  response: OrganizerResponse,
  writingPrompt?: string,
): void {
  const template = ORGANIZER_TEMPLATES[response.templateId]
  if (!template) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 20
  const pageW = 210
  const maxW = pageW - margin * 2
  let y = margin

  function addText(text: string, size: number, bold = false, color = '#1A1D23') {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const hex = color.replace('#', '')
    doc.setTextColor(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16))
    const lines = doc.splitTextToSize(text, maxW)
    doc.text(lines, margin, y)
    y += lines.length * 7
  }

  function checkPage(needed = 24) {
    if (y + needed > 280) { doc.addPage(); y = margin }
  }

  // Header
  addText('Easy Annotate — Graphic Organizer', 18, true, '#4A90D9')
  y += 2
  addText(template.name, 14, true)
  y += 1
  addText(`Student: ${studentName}`, 11, false, '#4B5563')
  addText(`Book: ${bookTitle}`, 11, false, '#4B5563')
  addText(`Scaffold: ${response.scaffoldLevel === 'guided' ? 'Guided' : 'Independent'} · ${new Date().toLocaleDateString()}`, 9, false, '#9CA3AF')
  if (writingPrompt?.trim()) {
    y += 2
    addText(`Prompt: ${writingPrompt.trim()}`, 10, false, '#4B5563')
  }
  y += 4
  doc.setDrawColor(200, 210, 230)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  for (const field of template.fields) {
    checkPage(28)
    const studentText = response.fields[field.id]?.trim() ?? ''

    // Field label box
    doc.setFillColor(248, 249, 252)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y, maxW, 7, 2, 2, 'FD')
    addText(`${field.icon}  ${field.label}`, 10, true, '#1A1D23')
    y += 2

    // Guided hint in light grey
    if (response.scaffoldLevel === 'guided') {
      addText(field.guidedHint, 9, false, '#9CA3AF')
      y += 1
    }

    // Student response box
    const responseLines = studentText
      ? doc.splitTextToSize(studentText, maxW - 8)
      : doc.splitTextToSize('(no response)', maxW - 8)
    const boxH = Math.max(16, responseLines.length * 7 + 8)
    checkPage(boxH + 4)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(209, 213, 219)
    doc.roundedRect(margin, y, maxW, boxH, 2, 2, 'FD')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const textColor = studentText ? '#1A1D23' : '#9CA3AF'
    const tc = textColor.replace('#', '')
    doc.setTextColor(parseInt(tc.slice(0, 2), 16), parseInt(tc.slice(2, 4), 16), parseInt(tc.slice(4, 6), 16))
    doc.text(responseLines, margin + 4, y + 6)
    y += boxH + 6
  }

  y += 4
  addText('Created with Easy Annotate · easy-annotate.com', 8, false, '#9CA3AF')

  const safeName = `${studentName}_${bookTitle}_${template.name}`.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)
  doc.save(`${safeName}.pdf`)
}
