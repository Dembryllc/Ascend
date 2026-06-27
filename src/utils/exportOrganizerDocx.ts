import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import type { OrganizerResponse } from '@/types'
import { ORGANIZER_TEMPLATES } from '@/data/organizerTemplates'

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function exportOrganizerDocx(
  studentName: string,
  bookTitle: string,
  response: OrganizerResponse,
  writingPrompt?: string,
): Promise<void> {
  const template = ORGANIZER_TEMPLATES[response.templateId]
  if (!template) return

  const children: Paragraph[] = [
    new Paragraph({
      text: 'Easy Annotate Writing Sample',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: template.name,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Student: ', bold: true }),
        new TextRun(studentName),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Book: ', bold: true }),
        new TextRun(bookTitle),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Support level: ', bold: true }),
        new TextRun(response.scaffoldLevel === 'guided' ? 'Guided' : 'Independent'),
      ],
    }),
  ]

  if (writingPrompt?.trim()) {
    children.push(
      new Paragraph({ text: 'Writing Prompt', heading: HeadingLevel.HEADING_2 }),
      new Paragraph(writingPrompt.trim()),
    )
  }

  children.push(new Paragraph({ text: 'Student Writing', heading: HeadingLevel.HEADING_2 }))

  for (const field of template.fields) {
    const studentText = response.fields[field.id]?.trim()
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: field.label, bold: true }),
        ],
      }),
    )

    if (response.scaffoldLevel === 'guided') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Sentence starter: ${field.guidedHint}`, italics: true, color: '6B7280' }),
          ],
        }),
      )
    }

    children.push(new Paragraph(studentText || '(no response)'))
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Created with Easy Annotate', italics: true, color: '9CA3AF' }),
      ],
    }),
  )

  const doc = new Document({
    sections: [{ children }],
  })
  const blob = await Packer.toBlob(doc)
  const fileName = safeFileName(`${studentName}_${bookTitle}_${template.name}`) || 'easy_annotate_writing'
  downloadBlob(blob, `${fileName}.docx`)
}
