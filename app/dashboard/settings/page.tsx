import Link from 'next/link'
import { Building2, Key, Palette, ChevronRight } from 'lucide-react'

const SECTIONS = [
  {
    href: '/dashboard/settings/brand',
    icon: Building2,
    color: '#D97706',
    title: 'Brand Profile',
    desc: 'ชื่อสำนักงาน, โลโก้, สี, ข้อมูลติดต่อ, และ default tone',
  },
  {
    href: '/dashboard/settings/api-keys',
    icon: Key,
    color: '#10B981',
    title: 'API Keys & Config',
    desc: 'OpenAI API key, model, Hermes poll interval, timezone',
  },
  {
    href: '/dashboard/settings/creative-profiles',
    icon: Palette,
    color: '#EC4899',
    title: 'Creative Profiles',
    desc: 'Visual style profiles สำหรับ image prompt generation',
  },
]

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">ตั้งค่าระบบและข้อมูลสำนักงาน</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href}
            className="card flex items-center gap-4 p-5 hover:border-orange-200 hover:shadow-sm transition group">
            <div className="flex size-10 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${color}15` }}>
              <Icon className="size-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="size-4 text-slate-300 group-hover:text-orange-400 transition shrink-0" />
          </Link>
        ))}
      </div>

      {/* Commands reference */}
      <div className="card p-6 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CLI Commands</h2>
        {[
          { cmd: 'pnpm dev', desc: 'Start Next.js dev server' },
          { cmd: 'pnpm hermes', desc: 'Start Hermes worker (polls queue)' },
          { cmd: 'pnpm rag:index', desc: 'Index Obsidian vault → FTS5 SQLite' },
          { cmd: 'pnpm build', desc: 'Production build' },
        ].map(({ cmd, desc }) => (
          <div key={cmd} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <code className="text-xs font-mono font-semibold text-orange-600">{cmd}</code>
            <span className="text-xs text-slate-500 text-right">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
