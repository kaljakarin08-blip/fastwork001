import Link from 'next/link'
import { ClipboardList, CheckCircle, Clock, CalendarCheck, AlertCircle, Loader2 } from 'lucide-react'

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/stats`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Pipeline stages for signature element
const STAGES = ['Draft', 'RAG', 'Content', 'Image', 'Done']

const statCards = [
  { key: 'today', label: 'Created Today', icon: ClipboardList, gold: false },
  { key: 'output_ready', label: 'Output Ready', icon: CheckCircle, gold: true },
  { key: 'review_pending', label: 'Review Pending', icon: Clock, gold: false },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarCheck, gold: false },
  { key: 'failed', label: 'Failed', icon: AlertCircle, gold: false },
  { key: 'running', label: 'Running Now', icon: Loader2, gold: false },
]

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
            Content Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">ระบบสร้าง Content อัตโนมัติ</p>
        </div>
        <Link href="/dashboard/requirements/new" className="btn-gold">
          + New Requirement
        </Link>
      </div>

      {/* Pipeline Stage Reference */}
      <div className="card p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          AI Pipeline Stages
        </p>
        <div className="flex items-center gap-2">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <div className="pipeline-stages">
                  <div className="pipeline-stage done" />
                </div>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">{stage}</span>
              {i < STAGES.length - 1 && <span className="text-gray-200 text-xs">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const val = stats ? (stats[card.key] ?? 0) : '—'
          return (
            <div
              key={card.key}
              className={`card p-5 flex items-start justify-between border-l-4 ${
                card.gold ? 'border-l-[#C9A227]' : 'border-l-gray-200'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {card.label}
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: card.gold ? '#C9A227' : '#111827', fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  {val}
                </p>
              </div>
              <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${card.gold ? 'bg-[#F5E6A8]' : 'bg-gray-100'}`}>
                <Icon className={`size-4.5 ${card.gold ? 'text-[#92751B]' : 'text-gray-400'}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
          Quick Actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard/requirements/new"
            className="flex flex-col gap-1 rounded-xl border-2 border-[#C9A227]/30 bg-[#C9A227]/5 px-4 py-4 hover:bg-[#C9A227]/10 hover:border-[#C9A227]/50 transition-all group"
          >
            <span className="text-sm font-bold text-[#92751B] group-hover:text-[#7A6015]">+ New Requirement</span>
            <span className="text-xs text-gray-500">สร้าง content brief ใหม่</span>
          </Link>
          <Link
            href="/dashboard/queue"
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-4 hover:bg-gray-50 hover:border-gray-300 transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">View Queue</span>
            <span className="text-xs text-gray-400">ดู Hermes job queue</span>
          </Link>
          <Link
            href="/dashboard/outputs"
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-4 hover:bg-gray-50 hover:border-gray-300 transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">Review Outputs</span>
            <span className="text-xs text-gray-400">ตรวจ content ที่สร้างแล้ว</span>
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <div>
            <p className="text-xs font-semibold text-emerald-800">ระบบ AI พร้อมใช้งาน</p>
            <p className="text-[11px] text-emerald-600">Hermes Worker · ทำงานอัตโนมัติ</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
          <span className="relative flex size-2 shrink-0">
            <span className="relative inline-flex rounded-full size-2 bg-blue-400" />
          </span>
          <div>
            <p className="text-xs font-semibold text-blue-800">ฐานข้อมูลความรู้</p>
            <p className="text-[11px] text-blue-600">Knowledge Vault · RAG พร้อม</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <span className="relative flex size-2 shrink-0">
            <span className="relative inline-flex rounded-full size-2 bg-slate-400" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-700">บันทึกอัตโนมัติ</p>
            <p className="text-[11px] text-slate-500">ข้อมูลเก็บบนเครื่องของคุณ</p>
          </div>
        </div>
      </div>
    </div>
  )
}
