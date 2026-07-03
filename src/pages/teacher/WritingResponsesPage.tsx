import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getWritingTask } from '@/firebase/writingTasks'
import { getWritingResponsesForClassroom } from '@/firebase/writingResponses'
import { getWritingFeedbackForClassroom, saveWritingFeedback } from '@/firebase/writingFeedback'
import { getUserProfile } from '@/firebase/auth'
import type { Classroom, UserProfile, WritingFeedback, WritingResponse, WritingTask } from '@/types'
import { ORGANIZER_TEMPLATES } from '@/data/organizerTemplates'
import { OrganizerSampleView } from '@/components/writing/OrganizerFields'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'

export default function WritingResponsesPage() {
  const { taskId = '' } = useParams()
  const { profile } = useAuth()
  const [task, setTask] = useState<WritingTask | null>(null)
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [students, setStudents] = useState<UserProfile[]>([])
  const [responses, setResponses] = useState<WritingResponse[]>([])
  const [feedback, setFeedback] = useState<WritingFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile || !taskId) return
    let cancelled = false
    Promise.all([getWritingTask(taskId), getClassroomByTeacher(profile.uid)])
      .then(async ([t, c]) => {
        if (cancelled) return
        if (!t) { setError('This writing task no longer exists.'); setLoading(false); return }
        if (t.createdBy !== profile.uid) { setError('You do not have access to this writing task.'); setLoading(false); return }
        setTask(t)
        setClassroom(c)
        if (c) {
          const [profs, resp, fb] = await Promise.all([
            Promise.all(c.studentIds.map((id) => getUserProfile(id))),
            getWritingResponsesForClassroom(c.id),
            getWritingFeedbackForClassroom(c.id),
          ])
          if (cancelled) return
          setStudents(profs.filter(Boolean) as UserProfile[])
          setResponses(resp.filter((r) => r.taskId === taskId))
          setFeedback(fb.filter((f) => f.taskId === taskId))
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load responses. Please refresh.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [profile, taskId])

  const responseByStudent = useMemo(() => new Map(responses.map((r) => [r.studentId, r])), [responses])
  const feedbackByStudent = useMemo(() => new Map(feedback.map((f) => [f.studentId, f])), [feedback])

  function handleFeedbackSaved(studentId: string, saved: WritingFeedback) {
    setFeedback((prev) => {
      const rest = prev.filter((f) => f.studentId !== studentId)
      return [...rest, saved]
    })
  }

  const rollup = useMemo(() => {
    const total = students.length
    let submitted = 0
    let completed = 0
    let reviewed = 0
    for (const s of students) {
      const r = responseByStudent.get(s.uid)
      if (r) submitted += 1
      if (r?.completed) completed += 1
      if (feedbackByStudent.get(s.uid)?.reviewed) reviewed += 1
    }
    return { total, submitted, completed, reviewed }
  }, [students, responseByStudent, feedbackByStudent])

  if (loading) return (
    <AppShell title="Writing Responses">
      <div className="h-8 w-64 bg-[#E5E7EB] rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#E5E7EB] rounded-2xl animate-pulse" />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#E5E7EB] rounded-2xl animate-pulse" />)}
      </div>
    </AppShell>
  )

  if (error) return (
    <AppShell title="Writing Responses">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <p className="text-[#4B5563] max-w-sm mb-6">{error}</p>
        <Link to="/teacher/writing" className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors">
          Back to Writing Tasks
        </Link>
      </div>
    </AppShell>
  )

  const template = task ? ORGANIZER_TEMPLATES[task.templateId] : null

  return (
    <AppShell title="Writing Responses">
      <Link to="/teacher/writing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4A90D9] hover:text-[#357ABD] mb-4">
        <ArrowLeft size={16} /> Writing Tasks
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1D23]">{task?.title}</h2>
        <p className="text-[#4B5563] mt-1">{template?.name}{task?.prompt ? ` · ${task.prompt}` : ''}</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Student data is protected under FERPA and used solely for educational purposes.</p>
      </div>

      {!classroom || students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <MessageSquare size={40} className="mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-[#4B5563]">No students in your classroom yet. Share your join code to get students in.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <RollupStat label="Students" value={rollup.total} />
            <RollupStat label="Started" value={`${rollup.submitted}/${rollup.total}`} />
            <RollupStat label="Completed" value={`${rollup.completed}/${rollup.total}`} />
            <RollupStat label="Reviewed" value={`${rollup.reviewed}/${rollup.total}`} />
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <StudentResponseRow
                key={student.uid}
                student={student}
                task={task!}
                classroomId={classroom.id}
                teacherId={profile!.uid}
                response={responseByStudent.get(student.uid) ?? null}
                feedback={feedbackByStudent.get(student.uid) ?? null}
                onSaved={(saved) => handleFeedbackSaved(student.uid, saved)}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}

function RollupStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-[#EDF2F7] rounded-2xl p-4">
      <div className="text-2xl font-bold text-[#1A1D23]">{value}</div>
      <div className="text-xs text-[#6B7280] mt-0.5">{label}</div>
    </div>
  )
}

function StudentResponseRow({
  student,
  task,
  classroomId,
  teacherId,
  response,
  feedback,
  onSaved,
}: {
  student: UserProfile
  task: WritingTask
  classroomId: string
  teacherId: string
  response: WritingResponse | null
  feedback: WritingFeedback | null
  onSaved: (saved: WritingFeedback) => void
}) {
  const template = ORGANIZER_TEMPLATES[task.templateId]
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState(feedback?.comment ?? '')
  const [reviewed, setReviewed] = useState(feedback?.reviewed ?? false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const status = response?.completed
    ? { label: 'Complete', cls: 'bg-green-100 text-[#4AA863]' }
    : response
      ? { label: 'In progress', cls: 'bg-amber-100 text-amber-700' }
      : { label: 'Not started', cls: 'bg-[#EEF1F6] text-[#6B7280]' }

  async function handleSave() {
    setSaveState('saving')
    try {
      await saveWritingFeedback(feedback != null, student.uid, task.id, classroomId, teacherId, comment.trim(), reviewed)
      setSaveState('saved')
      onSaved({
        id: `${student.uid}_${task.id}`,
        studentId: student.uid,
        taskId: task.id,
        classroomId,
        teacherId,
        comment: comment.trim(),
        reviewed,
        updatedAt: new Date(),
      })
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div className="bg-white border border-[#EDF2F7] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#F8F9FC] transition-colors"
      >
        <span className="text-[#9CA3AF]">{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
        <span className="font-bold text-[#1A1D23] flex-1 min-w-0 truncate">{student.displayName}</span>
        {feedback?.reviewed && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5BB974] bg-green-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={11} /> Reviewed
          </span>
        )}
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#F3F4F6] px-4 py-4 space-y-4">
          {response && template ? (
            <OrganizerSampleView template={template} fields={response.fields} />
          ) : (
            <p className="text-sm text-[#9CA3AF] italic py-2">This student hasn't started this writing task yet.</p>
          )}

          <div className="bg-[#F8F9FC] border border-[#E5E7EB] rounded-2xl p-4">
            <label className="block text-sm font-bold text-[#1A1D23] mb-2">Feedback for {student.displayName}</label>
            <textarea
              value={comment}
              onChange={(e) => { setComment(e.target.value); setSaveState('idle') }}
              rows={3}
              maxLength={800}
              placeholder="Leave a comment for this student…"
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base resize-y focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-medium text-[#4B5563] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => { setReviewed(e.target.checked); setSaveState('idle') }}
                  className="w-4 h-4 accent-[#5BB974]"
                />
                Mark as reviewed
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9CA3AF]">
                  {saveState === 'saving' && 'Saving…'}
                  {saveState === 'saved' && '✓ Saved'}
                  {saveState === 'error' && 'Could not save'}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="bg-[#4A90D9] text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-[#357ABD] disabled:opacity-60 transition-colors"
                >
                  Save feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
