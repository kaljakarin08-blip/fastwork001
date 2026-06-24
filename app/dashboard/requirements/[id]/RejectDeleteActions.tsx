'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, XCircle, Loader2, RefreshCw } from 'lucide-react'

export default function RejectDeleteActions({
  requirementId,
  status,
}: {
  requirementId: string
  status: string
}) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  async function handleReject() {
    setRejecting(true)
    setError('')
    try {
      const res = await fetch(`/api/local/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setRejecting(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/local/requirements/${requirementId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      router.push('/dashboard/requirements')
    } catch (err) {
      setError(String(err))
      setDeleting(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError('')
    try {
      // Reset status + create new job
      await fetch(`/api/local/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'requested' }),
      })
      await fetch(`/api/local/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement_id: requirementId }),
      })
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setRegenerating(false)
    }
  }

  const alreadyRejected = status === 'rejected'

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500 max-w-[200px] truncate">{error}</span>}

      {/* Regenerate — show when rejected or failed */}
      {(alreadyRejected || status === 'failed' || status === 'needs_research') && (
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
        >
          {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Regenerate
        </button>
      )}

      {/* Reject */}
      {!alreadyRejected && status !== 'published' && (
        <button
          onClick={handleReject}
          disabled={rejecting}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition"
        >
          {rejecting ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
          Reject
        </button>
      )}

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-medium">ยืนยันลบ?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            ลบเลย
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
        >
          <Trash2 className="size-3.5" />
          ลบ
        </button>
      )}
    </div>
  )
}
