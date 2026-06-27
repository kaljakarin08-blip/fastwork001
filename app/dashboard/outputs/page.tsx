import Link from 'next/link'
import { statusLabel, statusColor } from '@/lib/utils'
import type { Requirement } from '@/types'

type OutputItem = Requirement & {
  domain?: string
  content_hook?: string | null
  content_body_preview?: string | null
}

async function getOutputs(): Promise<OutputItem[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/requirements?status=output_ready&includeContent=true`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function OutputsPage() {
  const outputs: OutputItem[] = await getOutputs()

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
          {outputs.map((req) => {
            const domainTag = String(req.domain ?? '')
            const domainBadge = domainTag === 'accounting'
              ? { emoji: '📊', label: 'บัญชี', cls: 'bg-emerald-100 text-emerald-700' }
              : { emoji: '⚖️', label: 'กฎหมาย', cls: 'bg-blue-100 text-blue-700' }
            return (
              <Link
                key={req.id}
                href={`/dashboard/requirements/${req.id}`}
                className="card block p-5 hover:border-orange-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${domainBadge.cls}`}>
                        {domainBadge.emoji} {domainBadge.label}
                      </span>
                      <p className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                        {req.title || req.topic}
                      </p>
                    </div>
                    {/* Hook preview */}
                    {req.content_hook && (
                      <p className="text-sm text-slate-700 font-medium mt-1 line-clamp-1">
                        {req.content_hook}
                      </p>
                    )}
                    {/* Body preview */}
                    {req.content_body_preview && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {req.content_body_preview}
                      </p>
                    )}
                    {/* Meta tags */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      {req.preferred_post_date && (
                        <span className="text-xs text-slate-400 font-mono">📅 {req.preferred_post_date}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
                    <span className="text-slate-300 group-hover:text-orange-400 transition-colors text-sm">ดูรายละเอียด →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
