import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher, createClassroom, removeStudentFromClassroom } from '@/firebase/classrooms'
import { getUserProfile } from '@/firebase/auth'
import { getBooksByTeacher, countBookStudentRecords, deleteTeacherBook } from '@/firebase/books'
import { assignBookToStudent, assignBookToClass } from '@/firebase/books'
import { deleteStudentAccount, getRemovedStudents, totalStudentRecords } from '@/firebase/students'
import type { DeleteStudentCounts } from '@/firebase/students'
import type { Classroom, Book, UserProfile } from '@/types'
import { Users, Copy, CheckCheck, CheckCircle2, Plus, BookOpen, Highlighter, Trash2, UserMinus, UserX } from 'lucide-react'

export default function ClassroomPage() {
  const { profile } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [students, setStudents] = useState<UserProfile[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [createError, setCreateError] = useState('')
  const [assignError, setAssignError] = useState('')
  const [assignSelects, setAssignSelects] = useState<Record<string, string>>({})
  const [assignedAll, setAssignedAll] = useState<Record<string, boolean>>({})
  const [confirmRemove, setConfirmRemove] = useState<UserProfile | null>(null)
  // Students un-enrolled but not deleted. Removal leaves no other link to them,
  // so this list is the only way back to an account the teacher still wants gone.
  const [removedStudents, setRemovedStudents] = useState<UserProfile[]>([])
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<UserProfile | null>(null)
  // null while the dry run is still counting — same contract as deleteImpact
  // below: never claim zero and then delete something.
  const [studentImpact, setStudentImpact] = useState<DeleteStudentCounts | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [confirmDeleteBook, setConfirmDeleteBook] = useState<Book | null>(null)
  // null while the count is still being read — the dialog says "checking…" rather
  // than claiming zero student notes and then deleting some.
  const [deleteImpact, setDeleteImpact] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getClassroomByTeacher(profile.uid),
      getBooksByTeacher(profile.uid),
      getRemovedStudents(profile.uid),
    ]).then(async ([c, b, removed]) => {
      setClassroom(c)
      setBooks(b)
      setRemovedStudents(removed)
      if (c) {
        const profiles = await Promise.all(c.studentIds.map((id) => getUserProfile(id)))
        setStudents(profiles.filter(Boolean) as UserProfile[])
      }
      setLoading(false)
    }).catch(() => {
      setLoadError('Could not load classroom data. Please refresh.')
      setLoading(false)
    })
  }, [profile])

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !newClassName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const c = await createClassroom(newClassName.trim(), profile.uid)
      setClassroom(c)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Could not create classroom. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function copyCode() {
    if (!classroom) return
    navigator.clipboard.writeText(classroom.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemoveStudent(student: UserProfile) {
    if (!classroom || !profile) return
    setBusy(true)
    setActionError('')
    try {
      await removeStudentFromClassroom(student.uid, classroom.id, profile.uid)
      setStudents((prev) => prev.filter((s) => s.uid !== student.uid))
      setClassroom((prev) => prev
        ? { ...prev, studentIds: prev.studentIds.filter((id) => id !== student.uid) }
        : prev)
      setBooks((prev) => prev.map((b) => ({
        ...b,
        assignedStudentIds: b.assignedStudentIds.filter((id) => id !== student.uid),
      })))
      setRemovedStudents((prev) => [...prev, { ...student, classroomId: null }]
        .sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setConfirmRemove(null)
    } catch {
      setActionError(`Could not remove ${student.displayName}. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  async function openDeleteStudent(student: UserProfile) {
    setConfirmDeleteStudent(student)
    setStudentImpact(null)
    setDeleteConfirmText('')
    setActionError('')
    try {
      const result = await deleteStudentAccount(student.uid, true)
      setStudentImpact(result.counts)
    } catch (err: unknown) {
      setActionError(err instanceof Error
        ? err.message
        : `Could not check what deleting ${student.displayName} would remove. Please try again.`)
    }
  }

  async function handleDeleteStudent(student: UserProfile) {
    if (!classroom && !student.removedByTeacherId) return
    setBusy(true)
    setActionError('')
    try {
      await deleteStudentAccount(student.uid)
      setStudents((prev) => prev.filter((s) => s.uid !== student.uid))
      setRemovedStudents((prev) => prev.filter((s) => s.uid !== student.uid))
      setClassroom((prev) => prev
        ? { ...prev, studentIds: prev.studentIds.filter((id) => id !== student.uid) }
        : prev)
      setBooks((prev) => prev.map((b) => ({
        ...b,
        assignedStudentIds: b.assignedStudentIds.filter((id) => id !== student.uid),
      })))
      setConfirmDeleteStudent(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `Could not delete ${student.displayName}. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  async function openDeleteBook(book: Book) {
    setConfirmDeleteBook(book)
    setDeleteImpact(null)
    setActionError('')
    setDeleteImpact(await countBookStudentRecords(book))
  }

  async function handleDeleteBook(book: Book) {
    setBusy(true)
    setActionError('')
    try {
      await deleteTeacherBook(book)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
      setConfirmDeleteBook(null)
    } catch {
      setActionError(`Could not delete ${book.title}. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  async function handleAssignBook(bookId: string, studentId: string) {
    setAssignError('')
    try {
      await assignBookToStudent(bookId, studentId)
      setBooks((prev) => prev.map((b) =>
        b.id === bookId ? { ...b, assignedStudentIds: [...new Set([...b.assignedStudentIds, studentId])] } : b
      ))
      setAssignSelects((prev) => ({ ...prev, [studentId]: '' }))
    } catch {
      setAssignError('Could not assign book. Please try again.')
    }
  }

  async function handleAssignAll(bookId: string) {
    setAssignError('')
    const ids = students.map((s) => s.uid)
    try {
      await assignBookToClass(bookId, ids)
      setBooks((prev) => prev.map((b) =>
        b.id === bookId ? { ...b, assignedStudentIds: [...new Set([...b.assignedStudentIds, ...ids])] } : b
      ))
      setAssignedAll((prev) => ({ ...prev, [bookId]: true }))
      setTimeout(() => setAssignedAll((prev) => ({ ...prev, [bookId]: false })), 3000)
    } catch {
      setAssignError('Could not assign book to class. Please try again.')
    }
  }

  if (loading) return (
    <AppShell title="Classroom">
      <div className="h-8 w-64 bg-[#E5E7EB] rounded-xl animate-pulse mb-6" />
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
          <div className="h-5 w-36 bg-[#E5E7EB] rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-[#E5E7EB] rounded animate-pulse mb-4" />
          <div className="flex items-center gap-3">
            <div className="h-14 w-44 bg-[#E5E7EB] rounded-xl animate-pulse" />
            <div className="h-14 w-24 bg-[#E5E7EB] rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
          <div className="h-5 w-32 bg-[#E5E7EB] rounded animate-pulse mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
              <div>
                <div className="h-4 w-32 bg-[#E5E7EB] rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
              <div className="h-8 w-28 bg-[#E5E7EB] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )

  if (loadError) return (
    <AppShell title="Classroom">
      <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
        <p className="text-red-600 font-semibold mb-2">Something went wrong</p>
        <p className="text-[#4B5563] text-sm">{loadError}</p>
      </div>
    </AppShell>
  )

  return (
    <AppShell title="Classroom">
      <h2 className="text-2xl font-bold text-[#1A1D23] mb-6">Classroom Management</h2>

      {!classroom ? (
        <div className="max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
          <h3 className="font-bold text-lg text-[#1A1D23] mb-1">Create your classroom</h3>
          <p className="text-sm text-[#4B5563] mb-4">Give your class a name to get started.</p>
          <form onSubmit={handleCreateClass} className="space-y-3">
            <label htmlFor="class-name" className="block text-sm font-semibold text-[#1A1D23]">
              Classroom name
            </label>
            <div className="flex gap-2">
              <input
                id="class-name"
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Room 12 Readers"
                required
                className="flex-1 border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
              />
              <button
                type="submit"
                disabled={creating}
                aria-label="Create classroom"
                className="bg-[#4A90D9] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#357ABD] transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            {createError && (
              <p className="text-sm text-red-600 mt-2">{createError}</p>
            )}
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Join code card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
            <h3 className="font-bold text-lg text-[#1A1D23] mb-1">{classroom.name}</h3>
            <p className="text-sm text-[#4B5563] mb-4">Share this code with your students so they can join.</p>
            <div className="flex items-center gap-3">
              <div className="bg-[#F8F9FC] border-2 border-[#4A90D9] rounded-xl px-6 py-3 font-mono text-3xl font-bold tracking-widest text-[#4A90D9]">
                {classroom.joinCode}
              </div>
              <button
                onClick={copyCode}
                aria-label="Copy join code"
                className="flex items-center gap-1.5 px-4 py-3 bg-[#4A90D9] text-white rounded-xl hover:bg-[#357ABD] transition-colors font-semibold"
              >
                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Students */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-[#4A90D9]" />
              <h3 className="font-bold text-lg text-[#1A1D23]">
                Students ({students.length})
              </h3>
            </div>
            {assignError && (
              <p className="text-sm text-red-600 mb-3">{assignError}</p>
            )}
            {students.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-[#4A90D9]" />
                </div>
                <h4 className="font-bold text-[#1A1D23] mb-1">No students yet</h4>
                <p className="text-sm text-[#4B5563] max-w-xs mx-auto">
                  Share the join code above with your students. They can enter it from their dashboard after signing up.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {students.map((s) => (
                  <li key={s.uid} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1A1D23]">{s.displayName}</p>
                      <p className="text-xs text-[#6B7280]">Student</p>
                    </div>
                    <div className="flex items-center gap-2">
                    {books.length > 0 && (
                      <select
                        value={assignSelects[s.uid] ?? ''}
                        onChange={(e) => {
                          const bookId = e.target.value
                          if (!bookId) return
                          setAssignSelects((prev) => ({ ...prev, [s.uid]: bookId }))
                          handleAssignBook(bookId, s.uid)
                        }}
                        aria-label={`Assign book to ${s.displayName}`}
                        className="text-xs border border-[#D1D5DB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
                      >
                        <option value="">Assign a book…</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}
                            disabled={b.assignedStudentIds.includes(s.uid)}
                          >
                            {b.title}{b.assignedStudentIds.includes(s.uid) ? ' ✓' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => { setActionError(''); setConfirmRemove(s) }}
                      aria-label={`Remove ${s.displayName} from classroom`}
                      className="flex items-center gap-1 text-xs font-semibold text-[#9CA3AF] hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <UserMinus size={14} /> Remove
                    </button>
                    <button
                      onClick={() => openDeleteStudent(s)}
                      aria-label={`Delete ${s.displayName}'s account`}
                      className="flex items-center gap-1 text-xs font-semibold text-[#9CA3AF] hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <UserX size={14} /> Delete
                    </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Removed students — the only remaining handle on an un-enrolled
              account. Without this a teacher who removed someone first (the
              natural order) could never finish deleting them in the app. */}
          {removedStudents.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
              <div className="flex items-center gap-2 mb-1">
                <UserX size={20} className="text-[#9CA3AF]" />
                <h3 className="font-bold text-lg text-[#1A1D23]">Removed from this class ({removedStudents.length})</h3>
              </div>
              <p className="text-sm text-[#4B5563] mb-4">
                These students still have an account and everything they wrote — removing
                them only ended their place in your class. Delete an account to erase it
                for good, or leave it alone and they can rejoin with your join code.
              </p>
              <ul className="divide-y divide-[#F3F4F6]">
                {removedStudents.map((s) => (
                  <li key={s.uid} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1A1D23] truncate">{s.displayName}</p>
                      <p className="text-xs text-[#6B7280]">
                        {s.removedAt
                          ? `Removed ${s.removedAt.toLocaleDateString()}`
                          : 'Removed from your class'}
                      </p>
                    </div>
                    <button
                      onClick={() => openDeleteStudent(s)}
                      aria-label={`Delete ${s.displayName}'s account`}
                      className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#9CA3AF] hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <UserX size={14} /> Delete account
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Books */}
          {books.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={20} className="text-[#4A90D9]" />
                <h3 className="font-bold text-lg text-[#1A1D23]">Your Books ({books.length})</h3>
              </div>
              <p className="text-sm text-[#4B5563] mb-4">
                {students.length > 0
                  ? 'Assign a book to every student at once, or remove one from your library.'
                  : 'Remove a book from your library. Assigning needs at least one student.'}
              </p>
              <div className="space-y-2">
                {books.map((b) => (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-[#F3F4F6] last:border-0">
                    <div>
                      <span className="text-sm font-medium text-[#1A1D23]">{b.title}</span>
                      {b.assignmentPrompt && <p className="text-xs text-[#6B7280] mt-1">{b.assignmentPrompt}</p>}
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Link
                        to={`/teacher/read/${b.id}`}
                        aria-label={`Read and annotate ${b.title}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-[#4A90D9] hover:bg-blue-50 transition-colors"
                      >
                        <Highlighter size={14} /> Read
                      </Link>
                      {students.length > 0 && (
                        <button
                          onClick={() => handleAssignAll(b.id)}
                          disabled={assignedAll[b.id]}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            assignedAll[b.id]
                              ? 'bg-[#5BB974]/20 text-[#5BB974] cursor-default'
                              : 'bg-[#5BB974] text-white hover:bg-[#4AA863]'
                          }`}
                        >
                          {assignedAll[b.id]
                            ? <><CheckCircle2 size={14} /> Assigned!</>
                            : 'Assign All'
                          }
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteBook(b)}
                        aria-label={`Delete ${b.title}`}
                        className="flex items-center gap-1 text-xs font-semibold text-[#9CA3AF] hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmRemove(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-[#1A1D23] mb-2">Remove from this classroom?</h3>
            <p className="text-[#4B5563] mb-1 font-semibold">{confirmRemove.displayName}</p>
            <p className="text-sm text-[#4B5563] mb-6">
              They keep their account and everything they have written — removing them
              only ends their place in this class, so your books and their notes are no
              longer shared with you. They can rejoin any time with the join code.
            </p>
            {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleRemoveStudent(confirmRemove)}
                disabled={busy}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors disabled:opacity-60"
              >
                {busy ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteStudent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteStudent(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-[#1A1D23] mb-2">Delete this account?</h3>
            <p className="text-[#4B5563] mb-1 font-semibold">{confirmDeleteStudent.displayName}</p>
            <p className="text-sm text-[#4B5563] mb-3">
              {studentImpact === null
                ? 'Checking what this would erase…'
                : totalStudentRecords(studentImpact) === 0
                ? 'They have not written anything yet. Their sign-in is deleted along with the account, so they will not be able to log in again. This cannot be undone.'
                : `This erases ${totalStudentRecords(studentImpact)} thing${totalStudentRecords(studentImpact) === 1 ? '' : 's'} they wrote — notes, writing and reading progress — and deletes their sign-in, so they will not be able to log in again. This cannot be undone.`}
            </p>
            <label htmlFor="delete-student-confirm" className="block text-xs font-semibold text-[#4B5563] mb-1">
              Type <span className="font-bold text-[#1A1D23]">{confirmDeleteStudent.displayName}</span> to confirm
            </label>
            <input
              id="delete-student-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteStudent(null)} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(confirmDeleteStudent)}
                disabled={
                  busy
                  || studentImpact === null
                  || deleteConfirmText.trim() !== confirmDeleteStudent.displayName
                }
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-bold transition-colors disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteBook && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteBook(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-[#1A1D23] mb-2">Delete this book?</h3>
            <p className="text-[#4B5563] mb-1 font-semibold">{confirmDeleteBook.title}</p>
            <p className="text-sm text-[#4B5563] mb-6">
              {deleteImpact === null
                ? 'Checking what this would remove…'
                : deleteImpact === 0
                ? 'No student has annotated this book yet. The PDF is removed for everyone it was assigned to, and any notes you made on it go too. This cannot be undone.'
                : `This also deletes ${deleteImpact} student note${deleteImpact === 1 ? '' : 's'} on this book, along with their reading progress and graphic organizers for it — and any notes you made on it yourself. This cannot be undone.`}
            </p>
            {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteBook(null)} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBook(confirmDeleteBook)}
                disabled={busy || deleteImpact === null}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
