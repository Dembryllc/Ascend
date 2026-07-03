import { useEffect, useRef, useState } from 'react'
import { Eye, FileDown, FileText, MessageSquare, PenLine, X } from 'lucide-react'
import type { OrganizerResponse, ScaffoldLevel, UserProfile, WritingFeedback, WritingTask } from '@/types'
import { isPro } from '@/types'
import { ORGANIZER_TEMPLATES } from '@/data/organizerTemplates'
import { getWritingResponse, saveWritingResponse } from '@/firebase/writingResponses'
import { getWritingFeedback } from '@/firebase/writingFeedback'
import { saveWritingTaskSample } from '@/firebase/writingTasks'
import { exportOrganizerPDF } from '@/utils/exportOrganizerPDF'
import { OrganizerFieldsForm, OrganizerSampleView } from './OrganizerFields'
import UpgradeModal from '@/components/shared/UpgradeModal'

type Mode = 'respond' | 'sample'

interface Props {
  task: WritingTask
  profile: UserProfile
  mode: Mode
  onClose: () => void
  /** Called after a teacher saves the exemplar (sample mode only). */
  onSampleSaved?: (sampleFields: Record<string, string>, sampleVisible: boolean) => void
}

type OrganizerDocxExporter = typeof import('@/utils/exportOrganizerDocx')['exportOrganizerDocx']

export default function WritingTaskModal({ task, profile, mode, onClose, onSampleSaved }: Props) {
  const template = ORGANIZER_TEMPLATES[task.templateId]
  const isGated = mode === 'respond' && profile.role === 'individual' && !isPro(profile)
  const canSwitch = mode === 'sample' || task.studentCanSwitch
  const hasSample = mode === 'respond' && task.sampleVisible && !!task.sampleFields

  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>(task.scaffoldDefault ?? 'guided')
  const [fields, setFields] = useState<Record<string, string>>(mode === 'sample' ? (task.sampleFields ?? {}) : {})
  const [responseExists, setResponseExists] = useState(false)
  const [teacherFeedback, setTeacherFeedback] = useState<WritingFeedback | null>(null)
  const [loading, setLoading] = useState(mode === 'respond' && !isGated)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSample, setShowSample] = useState(false)
  const [sampleVisibleDraft, setSampleVisibleDraft] = useState(task.sampleVisible)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [docxExporter, setDocxExporter] = useState<OrganizerDocxExporter | null>(null)
  const [docxStatus, setDocxStatus] = useState<'idle' | 'exporting' | 'exported' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the learner's existing response (respond mode only). In every other
  // case `loading` is already initialised to false, so nothing to do here.
  useEffect(() => {
    if (mode !== 'respond' || isGated) return
    let cancelled = false
    Promise.all([
      getWritingResponse(profile.uid, task.id),
      getWritingFeedback(profile.uid, task.id),
    ])
      .then(([existing, fb]) => {
        if (cancelled) return
        if (existing) {
          setResponseExists(true)
          setFields(existing.fields)
          setScaffoldLevel(existing.scaffoldLevel)
        }
        if (fb?.reviewed && fb.comment.trim()) setTeacherFeedback(fb)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearPendingSave() {
    if (!saveTimer.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = null
  }

  function handleFieldChange(fieldId: string, value: string) {
    const next = { ...fields, [fieldId]: value }
    setFields(next)
    if (mode !== 'respond') return
    clearPendingSave()
    setSaveStatus('idle')
    saveTimer.current = setTimeout(() => void persistResponse(next), 1000)
  }

  async function persistResponse(currentFields: Record<string, string>, markComplete = false) {
    setSaveStatus('saving')
    try {
      await saveWritingResponse(
        responseExists,
        profile.uid,
        task.id,
        task.classroomId,
        task.templateId,
        scaffoldLevel,
        currentFields,
        markComplete,
      )
      setResponseExists(true)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleMarkComplete() {
    clearPendingSave()
    void persistResponse(fields, true)
  }

  const [sampleSaveState, setSampleSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function handleSaveSample() {
    setSampleSaveState('saving')
    try {
      await saveWritingTaskSample(task.id, fields, sampleVisibleDraft)
      setSampleSaveState('saved')
      onSampleSaved?.(fields, sampleVisibleDraft)
    } catch {
      setSampleSaveState('error')
    }
  }

  function buildResponseForExport(): OrganizerResponse {
    return {
      id: '',
      studentId: profile.uid,
      bookId: '',
      classroomId: task.classroomId,
      templateId: task.templateId,
      scaffoldLevel,
      fields,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  function handleExportPDF() {
    exportOrganizerPDF(profile.displayName, task.title, buildResponseForExport(), task.prompt)
  }

  async function handleExportDocx() {
    if (!docxExporter) return
    setDocxStatus('exporting')
    try {
      await docxExporter(profile.displayName, task.title, buildResponseForExport(), task.prompt)
      setDocxStatus('exported')
    } catch {
      setDocxStatus('error')
    }
  }

  // Escape to close + cleanup + lazy docx exporter
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => clearPendingSave(), [])

  useEffect(() => {
    if (isGated) return
    let mounted = true
    import('@/utils/exportOrganizerDocx')
      .then((mod) => { if (mounted) setDocxExporter(() => mod.exportOrganizerDocx) })
      .catch(() => { if (mounted) setDocxExporter(null) })
    return () => { mounted = false }
  }, [isGated])

  if (!template) return null

  if (showUpgrade) {
    return (
      <UpgradeModal
        title="Writing tasks are a Pro feature"
        description="Upgrade to Pro to build structured writing with graphic organizers, sentence starters, and PDF export."
        onClose={() => setShowUpgrade(false)}
      />
    )
  }

  const headerSub = mode === 'sample' ? 'Sample answer · what a strong response looks like' : `${template.name} · ${template.gradeRange}`

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'sample' ? 'Author sample answer' : 'Writing task'}
        className="bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#F3F4F6] shrink-0 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-[#1A1D23] truncate">{task.title}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5 truncate">{headerSub}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {mode === 'respond' && hasSample && (
              <button
                onClick={() => setShowSample((s) => !s)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors ${
                  showSample ? 'bg-[#9B7FD4] text-white' : 'text-[#9B7FD4] hover:bg-purple-50'
                }`}
              >
                {showSample ? <PenLine size={16} /> : <Eye size={16} />}
                <span className="hidden sm:inline">{showSample ? 'My writing' : 'Sample'}</span>
              </button>
            )}
            {mode === 'respond' && !isGated && !showSample && (
              <>
                <button
                  onClick={handleExportDocx}
                  disabled={!docxExporter}
                  title="Download as a Google Docs-compatible document"
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#5BB974] hover:bg-green-50 disabled:text-[#9CA3AF] disabled:hover:bg-transparent px-3 py-2 rounded-xl transition-colors"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">
                    {!docxExporter ? 'Preparing…' : docxStatus === 'exporting' ? 'Creating…' : 'Google Doc'}
                  </span>
                </button>
                <button
                  onClick={handleExportPDF}
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

        {/* Scaffold toggle */}
        {canSwitch && !showSample && !isGated && (
          <div className="px-6 py-2.5 border-b border-[#F3F4F6] shrink-0 flex items-center justify-between">
            <span className="text-xs text-[#4B5563] font-medium">Scaffold level</span>
            <div className="flex rounded-lg overflow-hidden border border-[#E5E7EB] text-xs font-semibold">
              {(['guided', 'independent'] as ScaffoldLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setScaffoldLevel(l)}
                  className={`px-3 py-1.5 capitalize transition-colors ${scaffoldLevel === l ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {isGated ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-3">📝</p>
              <p className="font-bold text-[#1A1D23] mb-1">Writing tasks are a Pro feature</p>
              <p className="text-sm text-[#4B5563] mb-5">Upgrade to access all templates, sentence starters, and export.</p>
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
          ) : showSample && task.sampleFields ? (
            <div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9B7FD4] mb-1">Sample answer</p>
                <p className="text-sm text-[#4B5563]">Use this example to see what a strong response looks like — then write your own in your words.</p>
              </div>
              <OrganizerSampleView template={template} fields={task.sampleFields} />
            </div>
          ) : (
            <div className="space-y-5">
              {teacherFeedback && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#4AA863] mb-1.5">
                    <MessageSquare size={13} /> Teacher feedback
                  </p>
                  <p className="text-sm text-[#1A1D23] whitespace-pre-wrap">{teacherFeedback.comment}</p>
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
                <PromptPanel task={task} scaffoldLevel={scaffoldLevel} mode={mode} />
                <OrganizerFieldsForm
                  template={template}
                  scaffoldLevel={scaffoldLevel}
                  fields={fields}
                  onChange={handleFieldChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isGated && !showSample && (
          <div className="px-6 pb-4 pt-2 shrink-0 border-t border-[#F3F4F6] flex items-center justify-between gap-3">
            {mode === 'respond' ? (
              <>
                <span className="text-xs text-[#9CA3AF]">
                  {saveStatus === 'saving' && 'Saving…'}
                  {saveStatus === 'saved' && '✓ Saved'}
                  {saveStatus === 'error' && 'Could not save — check your connection'}
                  {saveStatus === 'idle' && 'Auto-saves as you type'}
                  {docxStatus === 'exported' && ' · Google Doc downloaded'}
                </span>
                <button onClick={handleMarkComplete} className="text-xs font-bold text-[#5BB974] hover:underline">
                  Mark complete
                </button>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-xs font-medium text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sampleVisibleDraft}
                    onChange={(e) => setSampleVisibleDraft(e.target.checked)}
                    className="w-4 h-4 accent-[#4A90D9]"
                  />
                  Show this sample to students
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#9CA3AF]">
                    {sampleSaveState === 'saving' && 'Saving…'}
                    {sampleSaveState === 'saved' && '✓ Sample saved'}
                    {sampleSaveState === 'error' && 'Could not save'}
                  </span>
                  <button
                    onClick={handleSaveSample}
                    disabled={sampleSaveState === 'saving'}
                    className="bg-[#4A90D9] text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-[#357ABD] disabled:opacity-60 transition-colors"
                  >
                    Save sample
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PromptPanel({ task, scaffoldLevel, mode }: { task: WritingTask; scaffoldLevel: ScaffoldLevel; mode: Mode }) {
  const template = ORGANIZER_TEMPLATES[task.templateId]
  return (
    <aside className="bg-green-50 border border-green-200 rounded-2xl p-4 xl:sticky xl:top-0">
      <p className="text-xs font-bold uppercase tracking-wide text-[#5BB974] mb-2">
        {mode === 'sample' ? 'Writing this sample for' : 'Writing prompt'}
      </p>
      <h3 className="font-bold text-[#1A1D23] text-base">{task.title}</h3>
      <p className="text-sm text-[#4B5563] mt-2 whitespace-pre-wrap">
        {task.prompt || `Use the ${template?.name.toLowerCase()} to organize your thinking.`}
      </p>
      <div className="mt-4 border-t border-green-200 pt-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-[#1A1D23]">Task type</p>
          <p className="text-sm text-[#4B5563]">{template?.name}</p>
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
