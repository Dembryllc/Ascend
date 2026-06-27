import { useEffect, useRef, useState } from 'react'
import { FileDown, FileText, X } from 'lucide-react'
import type { Book, OrganizerResponse, ScaffoldLevel, UserProfile } from '@/types'
import type { OrganizerTemplate, OrganizerField } from '@/data/organizerTemplates'
import { isPro } from '@/types'
import { ORGANIZER_TEMPLATES, TEMPLATE_ORDER } from '@/data/organizerTemplates'
import { getOrganizerResponse, saveOrganizerResponse } from '@/firebase/organizers'
import { exportOrganizerPDF } from '@/utils/exportOrganizerPDF'
import UpgradeModal from '@/components/shared/UpgradeModal'

interface Props {
  book: Book
  profile: UserProfile
  onClose: () => void
}

type OrganizerDocxExporter = typeof import('@/utils/exportOrganizerDocx')['exportOrganizerDocx']

export default function OrganizerModal({ book, profile, onClose }: Props) {
  const needsPicker = !book.organizerTemplateId && profile.role !== 'student'
  const canSwitch = book.organizerStudentCanSwitch !== false
  const initialTemplateId = book.organizerTemplateId ?? null
  const isGated = profile.role === 'individual' && !isPro(profile)

  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId)
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>(book.organizerScaffoldDefault ?? 'guided')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [responseId, setResponseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isGated && Boolean(initialTemplateId))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [docxExporter, setDocxExporter] = useState<OrganizerDocxExporter | null>(null)
  const [docxStatus, setDocxStatus] = useState<'idle' | 'exporting' | 'exported' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const id = window.setTimeout(() => {
      if (isGated || !templateId) {
        if (!cancelled) setLoading(false)
        return
      }
      getOrganizerResponse(profile.uid, book.id)
        .then((existing) => {
          if (cancelled || !existing) return
          setResponseId(existing.id)
          setFields(existing.fields)
          setScaffoldLevel(existing.scaffoldLevel)
          if (existing.templateId !== templateId) setTemplateId(existing.templateId)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFieldChange(fieldId: string, value: string) {
    const next = { ...fields, [fieldId]: value }
    setFields(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')
    saveTimer.current = setTimeout(() => persistSave(next), 1000)
  }

  function clearPendingSave() {
    if (!saveTimer.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = null
  }

  async function persistSave(currentFields: Record<string, string>, markComplete = false) {
    if (!templateId) return
    setSaveStatus('saving')
    try {
      const id = await saveOrganizerResponse(
        responseId,
        profile.uid,
        book.id,
        profile.classroomId,
        templateId,
        scaffoldLevel,
        currentFields,
        markComplete,
      )
      setResponseId(id)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleMarkComplete() {
    clearPendingSave()
    void persistSave(fields, true)
  }

  function handleExport() {
    if (!templateId || !book) return
    const response: OrganizerResponse = {
      id: responseId ?? '',
      studentId: profile.uid,
      bookId: book.id,
      classroomId: profile.classroomId,
      templateId,
      scaffoldLevel,
      fields,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    exportOrganizerPDF(profile.displayName, book.title, response, book.organizerPrompt)
  }

  async function handleExportDocx() {
    if (!templateId || !book || !docxExporter) return
    setDocxStatus('exporting')
    const response: OrganizerResponse = {
      id: responseId ?? '',
      studentId: profile.uid,
      bookId: book.id,
      classroomId: profile.classroomId,
      templateId,
      scaffoldLevel,
      fields,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    try {
      await docxExporter(profile.displayName, book.title, response, book.organizerPrompt)
      setDocxStatus('exported')
    } catch {
      setDocxStatus('error')
    }
  }

  const template = templateId ? ORGANIZER_TEMPLATES[templateId] : null

  // Trap focus on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => clearPendingSave(), [])

  useEffect(() => {
    if (!templateId || isGated) return
    let mounted = true
    import('@/utils/exportOrganizerDocx')
      .then((mod) => {
        if (mounted) setDocxExporter(() => mod.exportOrganizerDocx)
      })
      .catch(() => {
        if (mounted) setDocxExporter(null)
      })
    return () => { mounted = false }
  }, [isGated, templateId])

  if (showUpgrade) {
    return (
      <UpgradeModal
        title="Graphic organizers are a Pro feature"
        description="Upgrade to Pro to access all graphic organizer templates, sentence starters, and PDF export."
        onClose={() => setShowUpgrade(false)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Graphic Organizer"
        className="bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#F3F4F6] shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-[#1A1D23]">
              {template ? template.name : 'Writing Task'}
            </h2>
            {template && (
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{template.gradeRange} · {book.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {template && (
              <>
                <button
                  onClick={handleExportDocx}
                  disabled={!docxExporter}
                  title="Download as a Google Docs-compatible document"
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#5BB974] hover:bg-green-50 disabled:text-[#9CA3AF] disabled:hover:bg-transparent px-3 py-2 rounded-xl transition-colors"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">
                    {!docxExporter && 'Preparing…'}
                    {docxExporter && docxStatus === 'exporting' && 'Creating…'}
                    {docxExporter && docxStatus !== 'exporting' && 'Google Doc'}
                  </span>
                </button>
                <button
                  onClick={handleExport}
                  title="Export PDF"
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#4A90D9] hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <FileDown size={16} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </>
            )}
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors text-[#6B7280]">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scaffold toggle (when template active) */}
        {template && canSwitch && (
          <div className="px-6 py-2.5 border-b border-[#F3F4F6] shrink-0 flex items-center justify-between">
            <span className="text-xs text-[#4B5563] font-medium">Scaffold level</span>
            <div className="flex rounded-lg overflow-hidden border border-[#E5E7EB] text-xs font-semibold">
              <button
                onClick={() => setScaffoldLevel('guided')}
                className={`px-3 py-1.5 transition-colors ${scaffoldLevel === 'guided' ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
              >
                Guided
              </button>
              <button
                onClick={() => setScaffoldLevel('independent')}
                className={`px-3 py-1.5 transition-colors ${scaffoldLevel === 'independent' ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
              >
                Independent
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {isGated ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-3">📝</p>
              <p className="font-bold text-[#1A1D23] mb-1">Graphic organizers are a Pro feature</p>
              <p className="text-sm text-[#4B5563] mb-5">Upgrade to access all templates, sentence starters, and PDF export.</p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : needsPicker && !templateId ? (
            <TemplatePicker onSelect={setTemplateId} scaffoldLevel={scaffoldLevel} onScaffoldChange={setScaffoldLevel} />
          ) : template ? (
            <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
              <WritingPromptPanel book={book} template={template} scaffoldLevel={scaffoldLevel} />
              <OrganizerForm
                template={template}
                scaffoldLevel={scaffoldLevel}
                fields={fields}
                onChange={handleFieldChange}
              />
            </div>
          ) : null}
        </div>

        {/* Footer save status */}
        {template && (
          <div className="px-6 pb-4 pt-2 shrink-0 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'error' && 'Could not save — check your connection'}
              {saveStatus === 'idle' && 'Auto-saves as you type'}
              {docxStatus === 'exported' && ' · Google Doc downloaded'}
              {docxStatus === 'error' && ' · Could not create Google Doc'}
            </span>
            <button
              onClick={handleMarkComplete}
              className="text-xs font-bold text-[#5BB974] hover:underline"
            >
              Mark complete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WritingPromptPanel({ book, template, scaffoldLevel }: {
  book: Book
  template: OrganizerTemplate
  scaffoldLevel: ScaffoldLevel
}) {
  return (
    <aside className="bg-green-50 border border-green-200 rounded-2xl p-4 xl:sticky xl:top-0">
      <p className="text-xs font-bold uppercase tracking-wide text-[#5BB974] mb-2">Writing prompt</p>
      <h3 className="font-bold text-[#1A1D23] text-base">{book.title}</h3>
      <p className="text-sm text-[#4B5563] mt-2">
        {book.organizerPrompt || `Use the ${template.name.toLowerCase()} to organize your thinking about this book.`}
      </p>
      <div className="mt-4 border-t border-green-200 pt-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-[#1A1D23]">Task type</p>
          <p className="text-sm text-[#4B5563]">{template.name}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-[#1A1D23]">Support level</p>
          <p className="text-sm text-[#4B5563]">
            {scaffoldLevel === 'guided'
              ? 'Guided: use each step, question, and sentence starter.'
              : 'Independent: use the labels to organize your own response.'}
          </p>
        </div>
      </div>
    </aside>
  )
}

function TemplatePicker({ onSelect, scaffoldLevel, onScaffoldChange }: {
  onSelect: (id: string) => void
  scaffoldLevel: ScaffoldLevel
  onScaffoldChange: (l: ScaffoldLevel) => void
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1A1D23] mb-3">Choose a scaffold level</p>
      <div className="flex rounded-xl overflow-hidden border border-[#E5E7EB] mb-5">
        {(['guided', 'independent'] as ScaffoldLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => onScaffoldChange(l)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${scaffoldLevel === l ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold text-[#1A1D23] mb-3">Choose an organizer</p>
      <div className="space-y-2">
        {TEMPLATE_ORDER.map((id) => {
          const t = ORGANIZER_TEMPLATES[id]
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="w-full text-left bg-[#F8F9FC] hover:bg-blue-50 border border-[#E5E7EB] hover:border-[#4A90D9] rounded-xl p-4 transition-all"
            >
              <p className="font-bold text-[#1A1D23] text-sm">{t.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{t.gradeRange} · {t.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OrganizerForm({ template, scaffoldLevel, fields, onChange }: {
  template: OrganizerTemplate
  scaffoldLevel: ScaffoldLevel
  fields: Record<string, string>
  onChange: (id: string, value: string) => void
}) {
  const guided = scaffoldLevel === 'guided'
  return (
    <div className="space-y-5">
      {template.fields.map((field: OrganizerField) => (
        <div key={field.id} className={`rounded-2xl border p-4 ${guided ? 'border-[#C7D8F0] bg-blue-50/40' : 'border-[#E5E7EB] bg-white'}`}>
          <label className={`block text-base font-bold mb-2 ${guided ? 'text-[#1A1D23]' : 'text-[#4B5563]'}`}>
            {guided && <span className="mr-1.5">{field.icon}</span>}
            {field.label}
          </label>
          {guided && (
            <div className="mb-3 space-y-2">
              <div className="bg-white/80 border border-[#DCEAFE] rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-[#4A90D9] uppercase tracking-wide mb-1">Try this sentence starter</p>
                <p className="text-sm text-[#1A1D23] italic">{field.guidedHint}</p>
              </div>
              {!!field.guidedSteps?.length && (
                <ol className="space-y-1 text-sm text-[#4B5563] list-decimal list-inside">
                  {field.guidedSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <textarea
            rows={field.rows}
            maxLength={500}
            value={fields[field.id] ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={guided ? field.guidedHint : field.placeholder}
            className={`w-full border rounded-xl px-3 py-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-y min-h-[112px] transition-colors ${
              guided ? 'border-[#C7D8F0] bg-white' : 'border-[#D1D5DB] bg-white'
            }`}
          />
          <p className="text-right text-xs text-[#9CA3AF] mt-1">{(fields[field.id] ?? '').length}/500</p>
        </div>
      ))}
    </div>
  )
}
