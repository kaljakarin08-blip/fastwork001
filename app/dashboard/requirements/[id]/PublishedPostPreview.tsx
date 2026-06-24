'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink, Send } from 'lucide-react'

interface CalendarItem {
  id: string
  scheduled_status: string
  fb_post_id?: string | null
  fb_permalink?: string | null
  published_at?: string | null
  post_date?: string
  post_time?: string
}

export default function PublishedPostPreview({
  calendar,
  requirementId,
}: {
  calendar: CalendarItem
  requirementId: string
}) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  const isPublished = calendar.scheduled_status === 'published' && calendar.fb_permalink
  const isError = calendar.scheduled_status === 'error'
  const isScheduled = calendar.scheduled_status === 'pending' || isError || calendar.scheduled_status === 'error'

  async function handlePublishNow() {
    setPublishing(true)
    setError('')
    try {
      const res = await fetch('/api/local/calendar/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: calendar.id }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; results?: Array<{ ok: boolean; error?: string; permalink?: string }> }
      if (!res.ok) throw new Error(json.error ?? 'Publish failed')
      const result = json.results?.[0]
      if (result && !result.ok) throw new Error(result.error ?? 'Publish failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPublishing(false)
    }
  }

  if (isPublished && calendar.fb_permalink) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-100 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100">
            <svg className="size-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">โพสต์สำเร็จบน Facebook</p>
            {calendar.published_at && (
              <p className="text-xs text-emerald-600">
                {new Date(calendar.published_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* FB link button */}
          <a
            href={calendar.fb_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166FE5] transition-colors shadow-sm"
          >
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            ดูโพสต์บน Facebook
            <ExternalLink className="size-3.5 opacity-70" />
          </a>

          {/* Embedded FB post */}
          <div className="rounded-xl overflow-hidden border border-emerald-100 bg-white">
            <p className="text-[11px] text-emerald-600 font-medium px-3 pt-2 pb-1 bg-emerald-50">ตัวอย่างโพสต์จริง</p>
            <iframe
              src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(calendar.fb_permalink)}&width=500&show_text=true`}
              width="100%"
              height="420"
              style={{ border: 'none', overflow: 'hidden', display: 'block' }}
              scrolling="no"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          </div>
        </div>
      </div>
    )
  }

  if (isScheduled) {
    return (
      <div className={`rounded-2xl border p-5 ${isError ? 'border-red-200 bg-red-50/40' : 'border-blue-200 bg-blue-50/50'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${isError ? 'text-red-700' : 'text-blue-800'}`}>
              {isError ? '⚠️ โพสต์ล้มเหลว — ลองใหม่' : 'พร้อมโพสต์ทันที'}
            </p>
            <p className={`text-xs ${isError ? 'text-red-500' : 'text-blue-600'}`}>
              กำหนดไว้ {calendar.post_date} เวลา {calendar.post_time} ·{' '}
              {isError ? 'ตรวจสอบ Page Access Token แล้วกด Retry' : 'กด Publish Now เพื่อส่งขึ้น Facebook เลย'}
            </p>
          </div>
          <button
            onClick={handlePublishNow}
            disabled={publishing}
            className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors shadow-sm ${isError ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1877F2] hover:bg-[#166FE5]'}`}
          >
            {publishing
              ? <Loader2 className="size-4 animate-spin" />
              : <Send className="size-4" />
            }
            {publishing ? 'กำลังโพสต์…' : isError ? 'Retry Publish' : 'Publish Now'}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
      </div>
    )
  }

  return null
}
