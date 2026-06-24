'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Activity, LayoutList,
  CalendarDays, BookOpen, ScrollText, Settings2, Palette, Building2, Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FacebookIcon, OpenAIIcon, SQLiteIcon } from '@/components/icons/brand-icons'

const contentItems = [
  { href: '/dashboard/requirements', label: 'Requirements', icon: ClipboardList },
  { href: '/dashboard/queue', label: 'Queue', icon: Activity },
  { href: '/dashboard/outputs', label: 'Outputs', icon: LayoutList },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
]

const systemItems = [
  { href: '/dashboard/facebook-accounts', label: 'FB Accounts', icon: FacebookIcon },
  { href: '/dashboard/rag', label: 'RAG / Vault', icon: BookOpen },
  { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
]

const settingsItems = [
  { href: '/dashboard/settings/brand', label: 'Brand Profile', icon: Building2 },
  { href: '/dashboard/settings/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/settings/creative-profiles', label: 'Creative Profiles', icon: Palette },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings2 },
]

function NavGroup({
  items,
  label,
  pathname,
}: {
  items: { href: string; label: string; icon: React.ElementType }[]
  label: string
  pathname: string
}) {
  return (
    <div>
      <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 h-9 rounded-lg px-3 text-sm font-medium transition-all',
                active
                  ? 'bg-[#C9A227]/15 text-[#F5E6A8]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', active ? 'text-[#C9A227]' : 'text-gray-500')}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="ml-auto w-1 h-4 rounded-full bg-[#C9A227] shrink-0" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const isOverview = pathname === '/dashboard'

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 h-screen"
      style={{ background: '#111827', borderRight: '1px solid #1F2937' }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-4 h-14 shrink-0"
        style={{ borderBottom: '1px solid #1F2937' }}
      >
        <div
          className="flex size-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: '#C9A227' }}
        >
          <span className="text-[11px] font-black text-gray-900 tracking-widest font-mono">L</span>
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-bold leading-tight text-gray-100"
            style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
          >
            Law AI OS
          </p>
          <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
            Content Platform v2
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Overview */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 h-9 rounded-lg px-3 text-sm font-medium transition-all',
            isOverview
              ? 'bg-[#C9A227]/15 text-[#F5E6A8]'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          )}
        >
          <LayoutDashboard
            className={cn('size-4 shrink-0', isOverview ? 'text-[#C9A227]' : 'text-gray-500')}
          />
          <span>Overview</span>
          {isOverview && <span className="ml-auto w-1 h-4 rounded-full bg-[#C9A227] shrink-0" />}
        </Link>

        <NavGroup items={contentItems} label="Content" pathname={pathname} />
        <NavGroup items={systemItems} label="System" pathname={pathname} />
        <NavGroup items={settingsItems} label="Settings" pathname={pathname} />
      </nav>

      {/* Worker Status */}
      <div className="px-3 pb-4 shrink-0">
        <div
          className="rounded-xl p-3"
          style={{ background: '#1F2937', border: '1px solid #374151' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <OpenAIIcon className="size-3 text-gray-400" />
              <span className="text-xs font-semibold text-gray-300">Hermes</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">local</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <SQLiteIcon className="size-3 text-gray-500" />
            <span className="text-[10px] text-gray-500">SQLite · FTS5 RAG</span>
          </div>
          <code
            className="text-[10px] font-mono px-2 py-1 rounded-md block"
            style={{ background: '#111827', color: '#C9A227' }}
          >
            pnpm hermes
          </code>
        </div>
      </div>
    </aside>
  )
}
