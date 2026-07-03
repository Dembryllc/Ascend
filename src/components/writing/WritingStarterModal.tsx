import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ScaffoldLevel, UserProfile, WritingTask } from '@/types'
import { ORGANIZER_TEMPLATES, TEMPLATE_ORDER } from '@/data/organizerTemplates'
import { createWritingTask } from '@/firebase/writingTasks'

interface Props {
  profile: UserProfile
  onClose: () => void
  onCreated: (task: WritingTask) => void
}

/**
 * Lets a student or individual start a personal, book-free writing piece.
 * Personal tasks are created with classroomId = null so they stay private to
 * the learner (never surfaced to a teacher).
 */
export default function WritingStarterModal({ profile, onClose, onCreated }: Props) {
  const [step, setStep] = useState<'template' | 'details'>('template')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [scaffold, setScaffold] = useState<ScaffoldLevel>('guided')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const template = templateId ? ORGANIZER_TEMPLATES[templateId] : null

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function chooseTemplate(id: string) {
    setTemplateId(id)
    if (!title) setTitle(ORGANIZER_TEMPLATES[id].name)
    setStep('details')
  }

  async function handleCreate() {
    if (!templateId || !title.trim()) return
    setCreating(true)
    setError('')
    try {
      const task = await createWritingTask({
        title: title.trim(),
        prompt: prompt.trim(),
        templateId,
        scaffoldDefault: scaffold,
        studentCanSwitch: true,
        createdBy: profile.uid,
        creatorRole: profile.role,
        classroomId: null,
      })
      onCreated(task)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start writing. Please try again.')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start new writing"
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#F3F4F6] shrink-0">
          <div>
            <h2 className="font-bold text-lg text-[#1A1D23]">Start new writing</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {step === 'template' ? 'Choose a graphic organizer to structure your writing.' : 'Name it and add a prompt (optional).'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-[#F3F4F6] text-[#6B7280]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 'template' ? (
            <div className="space-y-2">
              {TEMPLATE_ORDER.map((id) => {
                const t = ORGANIZER_TEMPLATES[id]
                return (
                  <button
                    key={id}
                    onClick={() => chooseTemplate(id)}
                    className="w-full text-left bg-[#F8F9FC] hover:bg-blue-50 border border-[#E5E7EB] hover:border-[#4A90D9] rounded-xl p-4 transition-all"
                  >
                    <p className="font-bold text-[#1A1D23] text-sm">{t.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{t.gradeRange} · {t.description}</p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#4A90D9]">Organizer</p>
                <p className="text-sm font-semibold text-[#1A1D23] mt-0.5">{template?.name}</p>
                <button onClick={() => setStep('template')} className="text-xs text-[#4A90D9] font-semibold hover:underline mt-1">
                  Change organizer
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. My weekend story"
                  className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Prompt <span className="font-normal text-[#9CA3AF]">(optional)</span></label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={400}
                  rows={3}
                  placeholder="What do you want to write about?"
                  className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base resize-y focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Support level</label>
                <div className="flex rounded-xl overflow-hidden border border-[#E5E7EB]">
                  {(['guided', 'independent'] as ScaffoldLevel[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setScaffold(l)}
                      className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${scaffold === l ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
            </div>
          )}
        </div>

        {step === 'details' && (
          <div className="px-6 pb-5 pt-2 shrink-0 border-t border-[#F3F4F6] flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="bg-[#4A90D9] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#357ABD] disabled:opacity-60 transition-colors"
            >
              {creating ? 'Starting…' : 'Start writing'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
