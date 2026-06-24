'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors'

const TONES = [
  'professional', 'friendly', 'educational', 'authoritative',
  'conversational', 'urgent', 'storytelling', 'inspirational',
]

export default function EditRequirementPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    topic: '',
    brief: '',
    target_audience: '',
    objective: '',
    tone: 'professional',
    notes: '',
    source_url: '',
    priority: 'normal',
  })

  useEffect(() => {
    fetch(`/api/local/requirements/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          title: d.title ?? '',
          topic: d.topic ?? '',
          brief: d.brief ?? '',
          target_audience: d.target_audience ?? '',
          objective: d.objective ?? '',
          tone: d.tone ?? 'professional',
          notes: d.notes ?? '',
          source_url: d.source_url ?? '',
          priority: d.priority ?? 'normal',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/local/requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      router.push(`/dashboard/requirements/${id}`)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>

  return (
    <div className="p-8 max-w-2xl mx-auto pb-20 space-y-6">
      <div>
        <a
          href={`/dashboard/requirements/${id}`}
          className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium"
        >
          ← กลับ
        </a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">แก้ไข Requirement</h1>
        <p className="text-sm text-slate-400 mt-1">แก้ไขได้ขณะ status เป็น requested / pending เท่านั้น</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="ชื่อที่จำง่าย"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Topic</label>
            <input
              className={inputCls}
              value={form.topic}
              onChange={(e) => set('topic', e.target.value)}
              placeholder="หัวข้อหลัก"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Brief</label>
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={form.brief}
              onChange={(e) => set('brief', e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม, angle, key message..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Source URL</label>
            <input
              className={inputCls}
              value={form.source_url}
              onChange={(e) => set('source_url', e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Target Audience</label>
              <input
                className={inputCls}
                value={form.target_audience}
                onChange={(e) => set('target_audience', e.target.value)}
                placeholder="เช่น เจ้าของ SME"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Objective</label>
              <input
                className={inputCls}
                value={form.objective}
                onChange={(e) => set('objective', e.target.value)}
                placeholder="เช่น สร้าง awareness"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('tone', t)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    form.tone === t
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Priority</label>
              <select
                className={inputCls}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Notes</label>
              <input
                className={inputCls}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="หมายเหตุ..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3">
          <a href={`/dashboard/requirements/${id}`} className="btn-ghost text-sm">Cancel</a>
          <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50 text-sm">
            {saving ? 'Saving…' : 'บันทึก →'}
          </button>
        </div>
      </form>
    </div>
  )
}
