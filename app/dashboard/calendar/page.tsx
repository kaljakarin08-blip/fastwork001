'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

interface CalendarRow {
  id: string
  requirement_id: string
  post_date: string
  post_time: string
  image_url: string | null
  scheduled_status: string | null
  title: string
  topic: string
  content_type: string
  caption: string | null
  hashtags: string | null
  page_name: string | null
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function typeColor(ct: string) {
  if (ct === 'carousel') return 'bg-blue-100 text-blue-700'
  if (ct === 'reel_script' || ct === 'short_video') return 'bg-purple-100 text-purple-700'
  return 'bg-emerald-100 text-emerald-700'
}

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarRow[]>([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(() => new Date())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/local/calendar')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .finally(() => setLoading(false))
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function itemsOnDay(day: number) {
    return items.filter(it => it.post_date === dateStr(day))
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const selectedItems = selectedDate ? items.filter(it => it.post_date === selectedDate) : []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
            Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading…' : `${items.length} posts scheduled`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
            <ChevronLeft className="size-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
            <ChevronRight className="size-4 text-slate-600" />
          </button>
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Today
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${selectedDate ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        {/* Calendar grid */}
        <div className="card overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[90px] border-b border-r border-slate-50 last:border-r-0" />
              const ds = dateStr(day)
              const dayItems = itemsOnDay(day)
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              const isPast = ds < todayStr

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : ds)}
                  className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors last:border-r-0 ${
                    isSelected ? 'bg-orange-50' : isPast ? 'bg-slate-50/50 hover:bg-slate-50' : 'hover:bg-orange-50/30'
                  }`}
                >
                  <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                    isToday ? 'bg-orange-600 text-white' : isSelected ? 'bg-orange-100 text-orange-700' : 'text-slate-600'
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 2).map(it => (
                      <div key={it.id} className={`rounded px-1 py-0.5 text-[10px] font-medium truncate ${typeColor(it.content_type)}`}>
                        {it.post_time?.slice(0, 5)} {it.title || it.topic}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{dayItems.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                <CalendarDays className="size-4 inline mr-1.5 text-orange-500" />
                {selectedDate}
              </p>
              <button onClick={() => setSelectedDate(null)} className="text-xs text-slate-400 hover:text-slate-600 transition">✕</button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                ไม่มีโพสต์วันนี้
              </div>
            ) : (
              selectedItems.map(it => (
                <Link key={it.id} href={`/dashboard/requirements/${it.requirement_id}`} className="block rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-orange-300 hover:shadow-sm transition">
                  {it.image_url && (
                    <img src={it.image_url} alt="" className="w-full h-36 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  {!it.image_url && (
                    <div className="w-full h-20 bg-slate-100 flex items-center justify-center">
                      <ImageIcon className="size-6 text-slate-300" />
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-orange-600">{it.post_time?.slice(0, 5)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColor(it.content_type)}`}>{it.content_type}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{it.title || it.topic}</p>
                    {it.page_name && <p className="text-[11px] text-slate-400">📘 {it.page_name}</p>}
                    {it.caption && (
                      <p className="text-xs text-slate-500 line-clamp-2">{it.caption}</p>
                    )}
                    {it.hashtags && (
                      <p className="text-[11px] text-blue-500 truncate">{it.hashtags}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-100 inline-block" /> Post</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-blue-100 inline-block" /> Carousel</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-purple-100 inline-block" /> Reel/Video</span>
      </div>
    </div>
  )
}
