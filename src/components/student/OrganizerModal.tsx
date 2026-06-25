import { useEffect, useRef, useState } from 'react'
import { FileDown, X } from 'lucide-react'
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

export default function OrganizerModal({ book, profile, onClose }: Props) {
  const needsPicker = !book.organizerTemplateId && profile.role !== 'student'
  const canSwitch = book.organizerStudentCanSwitch !== false

  const [templateId, setTemplateId] = useState<string | null>(book.organizerTemplateId ?? null)
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>(book.organizerScaffoldDefault ?? 'guided')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [responseId, setResponseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Gate: individual users must be Pro
  const isGated = profile.role === 'individual' && !isPro(profile)

  useEffect(() => {
    if (isGated || !templateId) { setLoading(false); return }
    getOrganizerResponse(profile.uid, book.id)
      .then((existing) => {
        if (existing) {
          setResponseId(existing.id)
          setFields(existing.fields)
          setScaffoldLevel(existing.scaffoldLevel)
          if (existing.templateId !== templateId) setTemplateId(existing.templateId)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFieldChange(fieldId: string, value: string) {
    const next = { ...fields, [fieldId]: value }
    setFields(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')
    saveTimer.current = setTimeout(() => persistSave(next), 1000)
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
    exportOrganizerPDF(profile.displayName, book.title, response)
  }

  const template = templateId ? ORGANIZER_TEMPLATES[templateId] : null

  // Trap focus on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F3F4F6] shrink-0">
          <div>
            <h2 className="font-bold text-lg text-[#1A1D23]">
              {template ? template.name : 'Graphic Organizer'}
            </h2>
            {template && (
              <p className="text-xs text-[#6B7280] mt-0.5">{template.gradeRange} · {book.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {template && (
              <button
                onClick={handleExport}
                title="Export PDF"
                className="flex items-center gap-1.5 text-sm font-semibold text-[#4A90D9] hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
              >
                <FileDown size={16} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors text-[#6B7280]">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scaffold toggle (when template active) */}
        {template && canSwitch && (
          <div className="px-5 py-2.5 border-b border-[#F3F4F6] shrink-0 flex items-center justify-between">
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
        <div className="overflow-y-auto flex-1 px-5 py-4">
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
            <OrganizerForm
              template={template}
              scaffoldLevel={scaffoldLevel}
              fields={fields}
              onChange={handleFieldChange}
            />
          ) : null}
        </div>

        {/* Footer save status */}
        {template && (
          <div className="px-5 pb-4 pt-2 shrink-0 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'error' && 'Could not save — check your connection'}
              {saveStatus === 'idle' && 'Auto-saves as you type'}
            </span>
            <button
              onClick={() => persistSave(fields, true)}
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
    <div className="space-y-4">
      {template.fields.map((field: OrganizerField) => (
        <div key={field.id}>
          <label className={`block text-sm font-bold mb-1 ${guided ? 'text-[#1A1D23]' : 'text-[#4B5563]'}`}>
            {guided && <span className="mr-1.5">{field.icon}</span>}
            {field.label}
          </label>
          {guided && (
            <p className="text-xs text-[#9CA3AF] mb-1 italic">{field.guidedHint}</p>
          )}
          <textarea
            rows={field.rows}
            maxLength={300}
            value={fields[field.id] ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={guided ? field.guidedHint : field.placeholder}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none transition-colors ${
              guided ? 'border-[#C7D8F0] bg-blue-50/30' : 'border-[#D1D5DB] bg-white'
            }`}
          />
          <p className="text-right text-xs text-[#9CA3AF] mt-0.5">{(fields[field.id] ?? '').length}/300</p>
        </div>
      ))}
    </div>
  )
}
