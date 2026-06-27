'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProcessAllButton({ count, failedCount }: { count: number; failedCount: number }) {
  const [status, setStatus] = useState<'idle' | 'retrying' | 'running' | 'done'>('idle')
  const [processed, setProcessed] = useState(0)
  const router = useRouter()

  async function retryAndRunAll() {
    setStatus('retrying')
    setProcessed(0)

    // Step 1: reset failed jobs → pending
    const retryRes = await fetch('/api/local/jobs/retry', { method: 'POST' })
    const retryData = await retryRes.json()
    const total = retryData.reset ?? 0

    if (total === 0) {
      setStatus('idle')
      router.refresh()
      return
    }

    // Step 2: process ทีละ job
    setStatus('running')
    for (let i = 0; i < total; i++) {
      await fetch('/api/hermes/run')
      setProcessed(i + 1)
    }

    setStatus('done')
    router.refresh()
    setTimeout(() => setStatus('idle'), 3000)
  }

  async function runAll() {
    if (count === 0) return
    setStatus('running')
    setProcessed(0)

    for (let i = 0; i < count; i++) {
      await fetch('/api/hermes/run')
      setProcessed(i + 1)
    }

    setStatus('done')
    router.refresh()
    setTimeout(() => setStatus('idle'), 3000)
  }

  const busy = status === 'running' || status === 'retrying'

  return (
    <div className="flex items-center gap-2">
      {/* Retry Failed */}
      {failedCount > 0 && (
        <button
          onClick={retryAndRunAll}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {status === 'retrying' ? (
            <>
              <span className="inline-block size-3 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              กำลัง reset…
            </>
          ) : status === 'running' && processed > 0 ? (
            <>
              <span className="inline-block size-3 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              ประมวลผล {processed}/{failedCount}…
            </>
          ) : status === 'done' ? (
            '✓ เสร็จแล้ว'
          ) : (
            `↺ Retry Failed (${failedCount})`
          )}
        </button>
      )}

      {/* Process All Pending */}
      {count > 0 && (
        <button
          onClick={runAll}
          disabled={busy}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
        >
          {status === 'running' && processed > 0 ? (
            <>
              <span className="inline-block size-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ประมวลผล {processed}/{count}…
            </>
          ) : status === 'done' ? '✓ เสร็จแล้ว' : `▶ Process All (${count})`}
        </button>
      )}
    </div>
  )
}
