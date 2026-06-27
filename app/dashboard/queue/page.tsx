import { statusLabel, statusColor } from '@/lib/utils'
import type { Job, Requirement } from '@/types'
import ProcessAllButton from './ProcessAllButton'

async function getQueue(): Promise<Array<{ job: Job; requirement: Requirement }>> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/hermes/queue`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getAllJobs(): Promise<Job[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/jobs`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function QueuePage() {
  const [queue, jobs] = await Promise.all([getQueue(), getAllJobs()])
  const failedCount = jobs.filter(j => j.status === 'failed').length

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hermes job queue — {queue.length} pending
            {failedCount > 0 && <span className="text-red-400 ml-2">· {failedCount} failed</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-blue-500" />
              </span>
              {queue.length} pending
            </span>
          )}
          <ProcessAllButton count={queue.length} failedCount={failedCount} />
        </div>
      </div>

      {/* Pending Jobs */}
      {queue.length > 0 && (
        <div className="card border-blue-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-blue-100 bg-blue-50">
            <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Pending Jobs</h2>
          </div>
          <div className="divide-y divide-blue-50">
            {queue.map(({ job, requirement }) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {requirement.title || requirement.topic}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {job.id.slice(-12)} · attempt {job.attempt_count}
                  </p>
                </div>
                <span className={`badge ${statusColor('pending')}`}>pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Jobs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            All Jobs ({jobs.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Job ID</th>
              <th className="th">Requirement</th>
              <th className="th">Status</th>
              <th className="th text-center">Attempts</th>
              <th className="th">Error</th>
              <th className="th">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  ยังไม่มี jobs
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{job.id.slice(-10)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{job.requirement_id.slice(-10)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor(job.status)}`}>{statusLabel(job.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 text-center">{job.attempt_count}</td>
                  <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">
                    {job.error_message ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {job.completed_at
                      ? new Date(job.completed_at).toLocaleString('th-TH')
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <div className="size-2 mt-1.5 rounded-full bg-amber-400 shrink-0" />
        <p className="text-sm text-amber-800">
          รัน{' '}
          <code className="font-mono bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md text-xs">
            pnpm hermes
          </code>{' '}
          บน local เพื่อประมวลผล pending jobs — worker poll ทุก 45 วินาที
        </p>
      </div>
    </div>
  )
}
