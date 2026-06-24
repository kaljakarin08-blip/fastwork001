'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, CalendarDays, Shuffle, Image, Clock, Loader2, Upload, X, Link2 } from 'lucide-react'
import type { FacebookAccount } from '@/types'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 transition'

export default function ApproveSchedule({
  requirementId,
  status,
  fbAccounts,
  fbAccountId,
}: {
  requirementId: string
  status: string
  fbAccounts: FacebookAccount[]
  fbAccountId: string | null
}) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [approving, setApproving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState('')
  const [scheduled, setScheduled] = useState<{ post_date: string; post_time: string } | null>(null)

  const [autoRandom, setAutoRandom] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageMode, setImageMode] = useState<'file' | 'url'>('file')
  const [uploading, setUploading] = useState(false)
  const [uploadedPreview, setUploadedPreview] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [captionOverride, setCaptionOverride] = useState('')
  const [postDate, setPostDate] = useState('')
  const [postTime, setPostTime] = useState('09:00')
  const [selectedFbId, setSelectedFbId] = useState(fbAccountId ?? fbAccounts[0]?.id ?? '')
  const [weekdayOnly, setWeekdayOnly] = useState(true)
  const [skipDays, setSkipDays] = useState(1)
  const [timeStart, setTimeStart] = useState(9)
  const [timeEnd, setTimeEnd] = useState(18)

  const canApprove = currentStatus === 'output_ready'
  const canSchedule = currentStatus === 'approved' || currentStatus === 'output_ready'

  async function handleApprove() {
    setApproving(true)
    setError('')
    try {
      const res = await fetch(`/api/local/requirements/${requirementId}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setCurrentStatus('approved')
    } catch (err) {
      setError(String(err))
    } finally {
      setApproving(false)
    }
  }

  async function handleSchedule() {
    setScheduling(true)
    setError('')
    try {
      const body = autoRandom
        ? {
            requirement_id: requirementId,
            facebook_account_id: selectedFbId,
            image_url: imageUrl || undefined,
            caption_override: captionOverride || undefined,
            auto_random: true,
            skip_days: skipDays,
            weekday_only: weekdayOnly,
            time_start: timeStart,
            time_end: timeEnd,
          }
        : {
            requirement_id: requirementId,
            facebook_account_id: selectedFbId,
            image_url: imageUrl || undefined,
            caption_override: captionOverride || undefined,
            auto_random: false,
            post_date: postDate,
            post_time: postTime,
          }

      const res = await fetch('/api/local/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { post_date: string; post_time: string }
      setScheduled(data)
      setCurrentStatus('scheduled')
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setScheduling(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadedPreview(URL.createObjectURL(file))
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/local/upload-image', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json() as { url: string }
      setImageUrl(url)
    } catch (err) {
      setError(String(err))
      setUploadedPreview('')
    } finally {
      setUploading(false)
    }
  }

  function clearImage() {
    setImageUrl('')
    setUploadedPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (currentStatus === 'scheduled' && scheduled) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 shrink-0">
          <CalendarDays className="size-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Scheduled ✓</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {scheduled.post_date} เวลา {scheduled.post_time} ·{' '}
            <a href="/dashboard/calendar" className="underline hover:text-emerald-800">ดู Calendar →</a>
          </p>
        </div>
      </div>
    )
  }

  if (!canApprove && !canSchedule) return null

  return (
    <div className="space-y-4">
      {/* Approve */}
      {canApprove && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Content พร้อม Review</p>
              <p className="text-xs text-blue-600 mt-0.5">อ่าน content + prompts ด้านบน แล้ว Approve เพื่อ schedule</p>
            </div>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shrink-0"
            >
              {approving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule */}
      {(canSchedule && (currentStatus === 'approved' || currentStatus === 'output_ready')) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-100 flex items-center gap-2">
            <CalendarDays className="size-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-800">Schedule Post</h3>
          </div>

          <div className="p-5 space-y-4">
            {/* FB Account */}
            {fbAccounts.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Facebook Page</label>
                <select className={inputCls} value={selectedFbId} onChange={e => setSelectedFbId(e.target.value)}>
                  {fbAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.page_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Image — file or URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Image className="size-3" /> แนบรูป <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  <button type="button" onClick={() => setImageMode('file')}
                    className={`px-3 py-1 flex items-center gap-1 font-medium transition ${imageMode === 'file' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Upload className="size-3" /> อัปโหลดไฟล์
                  </button>
                  <button type="button" onClick={() => setImageMode('url')}
                    className={`px-3 py-1 flex items-center gap-1 font-medium transition ${imageMode === 'url' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Link2 className="size-3" /> วาง URL
                  </button>
                </div>
              </div>

              {imageMode === 'file' ? (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden" onChange={handleFileChange} />
                  {!uploadedPreview ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition">
                      <Upload className="size-6" />
                      <span className="text-sm font-medium">คลิกเพื่อเลือกรูป</span>
                      <span className="text-xs">JPG, PNG, WebP, GIF · max 10MB</span>
                    </button>
                  ) : (
                    <div className="relative w-fit">
                      <img src={uploadedPreview} alt="preview" className="h-36 rounded-xl object-cover border border-slate-200" />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                          <Loader2 className="size-5 animate-spin text-orange-500" />
                        </div>
                      )}
                      {!uploading && (
                        <button type="button" onClick={clearImage}
                          className="absolute -top-2 -right-2 size-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition">
                          <X className="size-3 text-white" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input className={inputCls} placeholder="https://cdn.midjourney.com/... หรือ URL รูปอื่นๆ"
                    value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                  {imageUrl && imageUrl.startsWith('http') && (
                    <img src={imageUrl} alt="preview" className="mt-2 h-32 w-auto rounded-lg object-cover border border-slate-200"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>
              )}
            </div>

            {/* Caption override */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Caption Override <span className="font-normal text-slate-400">(optional — ถ้าว่างใช้ caption จาก AI)</span>
              </label>
              <textarea
                className={`${inputCls} min-h-[72px] resize-y`}
                placeholder="แก้ caption ก่อน publish (ถ้าไม่แก้ ระบบใช้ caption ที่ AI สร้าง)"
                value={captionOverride}
                onChange={e => setCaptionOverride(e.target.value)}
              />
            </div>

            {/* Schedule mode toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setAutoRandom(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${!autoRandom ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Clock className="size-4" /> กำหนดวันเอง
              </button>
              <button
                type="button"
                onClick={() => setAutoRandom(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${autoRandom ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Shuffle className="size-4" /> Auto Random
              </button>
            </div>

            {!autoRandom ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">วันที่โพสต์</label>
                  <input type="date" className={inputCls} value={postDate} onChange={e => setPostDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">เวลา</label>
                  <input type="time" className={inputCls} value={postTime} onChange={e => setPostTime(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">เริ่มหลังจาก (วัน)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={skipDays}
                      min={0}
                      max={30}
                      onChange={e => setSkipDays(Number(e.target.value))}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">0 = วันนี้, 1 = พรุ่งนี้</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Time Window</label>
                    <div className="flex items-center gap-2">
                      <input type="number" className={`${inputCls} w-16`} value={timeStart} min={0} max={23} onChange={e => setTimeStart(Number(e.target.value))} />
                      <span className="text-slate-400 text-sm">—</span>
                      <input type="number" className={`${inputCls} w-16`} value={timeEnd} min={1} max={23} onChange={e => setTimeEnd(Number(e.target.value))} />
                      <span className="text-xs text-slate-400">น.</span>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300 accent-orange-600"
                    checked={weekdayOnly}
                    onChange={e => setWeekdayOnly(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">วันจันทร์–ศุกร์ เท่านั้น (ข้าม Sat/Sun)</span>
                </label>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSchedule}
              disabled={scheduling || (!autoRandom && !postDate)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition"
            >
              {scheduling ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
              {scheduling ? 'Scheduling…' : 'Schedule Post → Calendar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
