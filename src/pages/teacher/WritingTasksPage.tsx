import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import {
  createWritingTask,
  getWritingTasksByCreator,
  deleteWritingTask,
  setSampleVisibility,
} from '@/firebase/writingTasks'
import type { Classroom, ScaffoldLevel, WritingTask } from '@/types'
import { ORGANIZER_TEMPLATES, TEMPLATE_ORDER } from '@/data/organizerTemplates'
import WritingTaskModal from '@/components/writing/WritingTaskModal'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutGrid,
  MessageSquare,
  PenLine,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'

export default function WritingTasksPage() {
  const { profile } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [tasks, setTasks] = useState<WritingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [sampleTask, setSampleTask] = useState<WritingTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<WritingTask | null>(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    Promise.all([getClassroomByTeacher(profile.uid), getWritingTasksByCreator(profile.uid)])
      .then(([c, t]) => {
        if (cancelled) return
        setClassroom(c)
        setTasks(t)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load writing tasks. Please refresh.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [profile])

  function handleCreated(task: WritingTask) {
    setTasks((prev) => [task, ...prev])
    setShowCreate(false)
    // Nudge the teacher straight into authoring the sample.
    setSampleTask(task)
  }

  function handleSampleSaved(taskId: string, fields: Record<string, string>, visible: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, sampleFields: fields, sampleVisible: visible } : t)))
  }

  async function toggleVisibility(task: WritingTask) {
    const next = !task.sampleVisible
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, sampleVisible: next } : t)))
    try {
      await setSampleVisibility(task.id, next)
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, sampleVisible: !next } : t)))
    }
  }

  async function handleDelete(task: WritingTask) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setConfirmDelete(null)
    try {
      await deleteWritingTask(task.id)
    } catch {
      setTasks((prev) => [task, ...prev])
    }
  }

  if (loading) return (
    <AppShell title="Writing Tasks">
      <div className="h-8 w-56 bg-[#E5E7EB] rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-[#E5E7EB] rounded-2xl animate-pulse" />)}
      </div>
    </AppShell>
  )

  if (error) return (
    <AppShell title="Writing Tasks">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <p className="text-[#4B5563] max-w-sm mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors">
          Try Again
        </button>
      </div>
    </AppShell>
  )

  return (
    <AppShell title="Writing Tasks">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1D23]">Writing Tasks</h2>
          <p className="text-[#4B5563] mt-1">
            Assign book-free graphic organizers to your class and give students a sample to model.
          </p>
        </div>
        {classroom && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-[#4A90D9] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#357ABD] transition-colors shrink-0"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New task</span><span className="sm:hidden">New</span>
          </button>
        )}
      </div>

      {!classroom ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={30} className="text-[#4A90D9]" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1D23] mb-2">Create a classroom first</h3>
          <p className="text-[#4B5563] mb-6 max-w-sm mx-auto">Writing tasks are assigned to a classroom. Set one up, then assign your first task.</p>
          <Link to="/teacher/classroom" className="inline-flex items-center gap-2 bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors">
            Go to Classroom <ArrowRight size={18} />
          </Link>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <LayoutGrid size={44} className="mx-auto text-[#D1D5DB] mb-4" />
          <h3 className="text-xl font-bold text-[#1A1D23] mb-2">No writing tasks yet</h3>
          <p className="text-[#4B5563] mb-6 max-w-sm mx-auto">Create a task to give every student in <span className="font-semibold">{classroom.name}</span> a structured writing prompt.</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors">
            <Plus size={18} /> New Writing Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TeacherTaskCard
              key={task.id}
              task={task}
              studentCount={classroom.studentIds.length}
              onAuthorSample={() => setSampleTask(task)}
              onToggleVisibility={() => toggleVisibility(task)}
              onDelete={() => setConfirmDelete(task)}
            />
          ))}
        </div>
      )}

      {showCreate && classroom && profile && (
        <CreateTaskModal
          classroomId={classroom.id}
          creatorUid={profile.uid}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {sampleTask && profile && (
        <WritingTaskModal
          task={sampleTask}
          profile={profile}
          mode="sample"
          onClose={() => setSampleTask(null)}
          onSampleSaved={(fields, visible) => handleSampleSaved(sampleTask.id, fields, visible)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-[#1A1D23] mb-2">Delete this writing task?</h3>
            <p className="text-[#4B5563] mb-1 font-semibold">{confirmDelete.title}</p>
            <p className="text-sm text-[#4B5563] mb-6">Students will no longer see this task. Their saved responses are not deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function TeacherTaskCard({
  task,
  studentCount,
  onAuthorSample,
  onToggleVisibility,
  onDelete,
}: {
  task: WritingTask
  studentCount: number
  onAuthorSample: () => void
  onToggleVisibility: () => void
  onDelete: () => void
}) {
  const template = ORGANIZER_TEMPLATES[task.templateId]
  const hasSample = !!task.sampleFields
  return (
    <div className="bg-white border border-[#EDF2F7] rounded-2xl p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="bg-green-100 text-[#5BB974] p-2.5 rounded-xl shrink-0">
          <LayoutGrid size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-[#1A1D23] line-clamp-1">{task.title}</h4>
          <p className="text-xs text-[#6B7280] mt-0.5">{template?.name} · {task.scaffoldDefault === 'independent' ? 'Independent' : 'Guided'}</p>
        </div>
        <button onClick={onDelete} aria-label={`Delete ${task.title}`} className="text-[#9CA3AF] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0">
          <Trash2 size={16} />
        </button>
      </div>

      {task.prompt && <p className="text-sm text-[#4B5563] mt-3 line-clamp-2">{task.prompt}</p>}

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A90D9] bg-blue-50 px-2 py-0.5 rounded-full">
          <Users size={11} /> {studentCount} student{studentCount === 1 ? '' : 's'}
        </span>
        {hasSample ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${task.sampleVisible ? 'text-[#9B7FD4] bg-purple-50' : 'text-[#6B7280] bg-[#EEF1F6]'}`}>
            <CheckCircle2 size={11} /> Sample {task.sampleVisible ? 'shared' : 'hidden'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full">
            No sample yet
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F3F4F6] space-y-2">
        <Link
          to={`/teacher/writing/${task.id}`}
          className="flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-[#4A90D9] hover:bg-[#357ABD] py-2.5 rounded-xl transition-colors"
        >
          <MessageSquare size={15} /> View responses
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onAuthorSample}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold text-[#4A90D9] hover:bg-blue-50 py-2 rounded-xl transition-colors"
          >
            <PenLine size={15} /> {hasSample ? 'Edit sample' : 'Create sample'}
          </button>
          {hasSample && (
            <button
              onClick={onToggleVisibility}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-[#6B7280] hover:bg-[#F3F4F6] py-2 px-3 rounded-xl transition-colors"
              title={task.sampleVisible ? 'Hide sample from students' : 'Show sample to students'}
            >
              {task.sampleVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateTaskModal({
  classroomId,
  creatorUid,
  onClose,
  onCreated,
}: {
  classroomId: string
  creatorUid: string
  onClose: () => void
  onCreated: (task: WritingTask) => void
}) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [templateId, setTemplateId] = useState<string>(TEMPLATE_ORDER[0])
  const [scaffold, setScaffold] = useState<ScaffoldLevel>('guided')
  const [studentCanSwitch, setStudentCanSwitch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!title.trim()) { setError('Give your task a title.'); return }
    setSaving(true)
    setError('')
    try {
      const task = await createWritingTask({
        title: title.trim(),
        prompt: prompt.trim(),
        templateId,
        scaffoldDefault: scaffold,
        studentCanSwitch,
        createdBy: creatorUid,
        creatorRole: 'teacher',
        classroomId,
      })
      onCreated(task)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the task. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="New writing task" className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[94vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-3 border-b border-[#F3F4F6] shrink-0">
          <h2 className="font-bold text-lg text-[#1A1D23]">New writing task</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Assigned to your whole class. You can add a sample after creating it.</p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Persuasive paragraph: school lunches"
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
              placeholder="What should students write about?"
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base resize-y focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Graphic organizer</label>
            <div className="space-y-2">
              {TEMPLATE_ORDER.map((id) => {
                const t = ORGANIZER_TEMPLATES[id]
                const active = templateId === id
                return (
                  <button
                    key={id}
                    onClick={() => setTemplateId(id)}
                    className={`w-full text-left border rounded-xl p-3 transition-all ${active ? 'border-[#4A90D9] bg-blue-50' : 'border-[#E5E7EB] bg-white hover:bg-[#F8F9FC]'}`}
                  >
                    <p className="font-bold text-[#1A1D23] text-sm">{t.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{t.gradeRange} · {t.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-1.5">Default support level</label>
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
          <label className="flex items-center gap-2 text-sm font-medium text-[#4B5563] cursor-pointer">
            <input type="checkbox" checked={studentCanSwitch} onChange={(e) => setStudentCanSwitch(e.target.checked)} className="w-4 h-4 accent-[#4A90D9]" />
            Let students switch between guided and independent
          </label>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 pb-5 pt-2 shrink-0 border-t border-[#F3F4F6] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="bg-[#4A90D9] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#357ABD] disabled:opacity-60 transition-colors"
          >
            {saving ? 'Creating…' : 'Create & add sample'}
          </button>
        </div>
      </div>
    </div>
  )
}
