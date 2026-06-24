import Link from 'next/link'
import { statusLabel, statusColor } from '@/lib/utils'
import type { Requirement } from '@/types'

async function getOutputs() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/requirements?status=output_ready`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function OutputsPage() {
  const outputs: Requirement[] = await getOutputs()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>Outputs</h1>
        <p className="text-sm text-gray-500 mt-1">{outputs.length} outputs พร้อม review</p>
      </div>

      {outputs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm font-medium">ยังไม่มี outputs</p>
          <p className="text-slate-400 text-sm mt-1">รัน Hermes Worker เพื่อประมวลผล requirements</p>
          <Link
            href="/dashboard/queue"
            className="inline-flex items-center gap-2 mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            View Queue →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {outputs.map((req) => (
            <Link
              key={req.id}
              href={`/dashboard/requirements/${req.id}`}
              className="card block p-5 hover:border-orange-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                    {req.title || req.topic}
                  </p>
                  {req.title && req.topic !== req.title && (
                    <p className="text-sm text-slate-400 mt-0.5 truncate">{req.topic}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                      {req.content_type}
                    </span>
                    {req.video_create ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                        Video
                      </span>
                    ) : null}
                    {req.preferred_post_date && (
                      <span className="text-xs text-slate-400 font-mono">{req.preferred_post_date}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`badge ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
                  <span className="text-slate-300 group-hover:text-orange-400 transition-colors text-sm">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
