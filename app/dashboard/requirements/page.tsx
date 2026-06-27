import Link from 'next/link'
import { statusLabel, statusColor } from '@/lib/utils'
import type { Requirement } from '@/types'

async function getRequirements(): Promise<Requirement[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/requirements`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function RequirementsPage() {
  const requirements = await getRequirements()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
            Requirements
          </h1>
          <p className="text-sm text-gray-500 mt-1">{requirements.length} รายการทั้งหมด</p>
        </div>
        <Link href="/dashboard/requirements/new" className="btn-gold">
          + New Requirement
        </Link>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">หัวข้อ / Content</th>
              <th className="th">FB Page</th>
              <th className="th">Status</th>
              <th className="th">วันที่โพสต์</th>
              <th className="th">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requirements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  ยังไม่มี requirements —{' '}
                  <Link href="/dashboard/requirements/new" className="text-orange-600 hover:underline font-medium">
                    สร้างใหม่
                  </Link>
                </td>
              </tr>
            ) : (
              requirements.map((req) => {
                const domainTag = String((req as Requirement & { domain?: string }).domain ?? '')
                const domainBadge = domainTag === 'accounting'
                  ? { emoji: '📊', label: 'บัญชี', cls: 'bg-emerald-100 text-emerald-700' }
                  : { emoji: '⚖️', label: 'กฎหมาย', cls: 'bg-blue-100 text-blue-700' }
                const fbPageName = (req as Requirement & { fb_page_name?: string }).fb_page_name
                const isReady = req.status === 'output_ready' || req.status === 'approved' || req.status === 'scheduled'
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${domainBadge.cls}`}>
                          {domainBadge.emoji} {domainBadge.label}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/requirements/${req.id}`}
                            className="font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                          >
                            {req.title || req.topic}
                          </Link>
                          {req.topic !== req.title && req.title && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{req.topic}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">
                      {fbPageName
                        ? fbPageName
                        : isReady
                          ? <span className="text-slate-300 text-xs">—</span>
                          : <span className="text-slate-400 text-xs">ยังไม่เลือก</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                      {req.preferred_post_date ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {req.priority === 'urgent' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Urgent</span>
                      ) : req.priority === 'high' ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">High</span>
                      ) : (
                        <span className="text-xs text-slate-400 capitalize">{req.priority}</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
