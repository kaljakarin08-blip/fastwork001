'use client'

import { useState, useEffect } from 'react'
import { Palette, Plus, Pencil, Trash2, X, Check, ImagePlus, Link2 } from 'lucide-react'
import type { CreativeProfile } from '@/types'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 transition'

const empty = {
  name: '',
  color_scheme: '',
  photography_style: '',
  logo_usage: '',
  visual_mood: '',
  do_not_use: '',
  notes: '',
}

function parseImageUrls(val: string | null | undefined): string[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

export default function CreativeProfilesPage() {
  const [profiles, setProfiles] = useState<CreativeProfile[]>([])
  const [editing, setEditing] = useState<CreativeProfile | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refImages, setRefImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')

  async function load() {
    const res = await fetch('/api/local/creative-profiles')
    if (res.ok) setProfiles(await res.json())
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(empty)
    setRefImages([])
    setNewImageUrl('')
    setEditing(null)
    setCreating(true)
    setError('')
  }

  function openEdit(p: CreativeProfile) {
    setForm({
      name: p.name,
      color_scheme: p.color_scheme ?? '',
      photography_style: p.photography_style ?? '',
      logo_usage: p.logo_usage ?? '',
      visual_mood: p.visual_mood ?? '',
      do_not_use: p.do_not_use ?? '',
      notes: p.notes ?? '',
    })
    setRefImages(parseImageUrls(p.reference_image_urls))
    setNewImageUrl('')
    setEditing(p)
    setCreating(false)
    setError('')
  }

  function addImageUrl() {
    const url = newImageUrl.trim()
    if (!url || !url.startsWith('http')) return
    setRefImages(prev => [...prev, url])
    setNewImageUrl('')
  }

  function removeImageUrl(idx: number) {
    setRefImages(prev => prev.filter((_, i) => i !== idx))
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อ Profile'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, reference_image_urls: refImages.length ? JSON.stringify(refImages) : null }
      if (editing) {
        await fetch(`/api/local/creative-profiles/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/local/creative-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      await load()
      closeForm()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบ profile นี้?')) return
    await fetch(`/api/local/creative-profiles/${id}`, { method: 'DELETE' })
    await load()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <a href="/dashboard/settings" className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium">
            ← Settings
          </a>
          <h1 className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
            Creative Profiles
          </h1>
          <p className="text-sm text-slate-500 mt-1">กำหนด visual style แต่ละประเภท เพื่อใช้กับ Hermes image prompt อัตโนมัติ</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition mt-6"
        >
          <Plus className="size-4" />
          New Profile
        </button>
      </div>

      {/* Profile cards */}
      {profiles.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
          <Palette className="size-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">ยังไม่มี Creative Profile</p>
          <p className="text-xs mt-1">สร้าง profile เพื่อให้ Hermes ใช้เป็น visual style ใน image prompt</p>
        </div>
      )}

      <div className="space-y-3">
        {profiles.map(p => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-pink-50">
                  <Palette className="size-4 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  {p.visual_mood && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.visual_mood}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600 transition"
                >
                  <Pencil className="size-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-red-300 hover:text-red-500 transition"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>

            {/* Preview chips */}
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {p.color_scheme && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                  🎨 {p.color_scheme.slice(0, 40)}{p.color_scheme.length > 40 ? '…' : ''}
                </span>
              )}
              {p.photography_style && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                  📷 {p.photography_style.slice(0, 40)}{p.photography_style.length > 40 ? '…' : ''}
                </span>
              )}
              {p.logo_usage && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                  🏷 {p.logo_usage.slice(0, 40)}{p.logo_usage.length > 40 ? '…' : ''}
                </span>
              )}
              {p.do_not_use && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] text-red-400">
                  🚫 {p.do_not_use.slice(0, 40)}{p.do_not_use.length > 40 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
            <h2 className="text-sm font-semibold text-slate-800">
              {editing ? `แก้ไข: ${editing.name}` : 'New Creative Profile'}
            </h2>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 transition">
              <X className="size-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ชื่อ Profile <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                placeholder="เช่น กฎหมายบริษัท, บัญชี, อสังหาฯ"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color Scheme</label>
                <input
                  className={inputCls}
                  placeholder="เช่น Navy #1A3A5C + Gold #C9A227"
                  value={form.color_scheme}
                  onChange={e => set('color_scheme', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Visual Mood / Atmosphere</label>
                <input
                  className={inputCls}
                  placeholder="เช่น clean professional, warm trustworthy"
                  value={form.visual_mood}
                  onChange={e => set('visual_mood', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Photography Style</label>
              <input
                className={inputCls}
                placeholder="เช่น modern Thai corporate office, minimalist studio, real estate lifestyle"
                value={form.photography_style}
                onChange={e => set('photography_style', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo & Brand Usage</label>
              <input
                className={inputCls}
                placeholder="เช่น โลโก้มุมล่างขวา, อย่าปิดหน้าคน, safe zone 10%"
                value={form.logo_usage}
                onChange={e => set('logo_usage', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ห้ามใช้ / Do Not Use</label>
              <input
                className={inputCls}
                placeholder="เช่น ห้ามภาพการ์ตูน, ห้ามตัวละครเคลื่อนไหว, ห้ามโลโก้คู่แข่ง"
                value={form.do_not_use}
                onChange={e => set('do_not_use', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes เพิ่มเติม</label>
              <textarea
                className={`${inputCls} min-h-[72px] resize-y`}
                placeholder="ข้อมูลเพิ่มเติมที่ Hermes ควรรู้เกี่ยวกับ visual style นี้"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>

            {/* Reference Images */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Reference Images
                <span className="ml-1.5 font-normal text-slate-400">(URL สาธารณะ — GPT-4o จะวิเคราะห์ style อัตโนมัติ)</span>
              </label>
              <div className="space-y-2 mb-2">
                {refImages.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <img src={url} alt="" className="size-10 rounded object-cover shrink-0 bg-slate-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span className="flex-1 text-[11px] text-slate-500 truncate font-mono">{url}</span>
                    <button type="button" onClick={() => removeImageUrl(idx)} className="text-slate-400 hover:text-red-400 transition shrink-0">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    className={`${inputCls} pl-8`}
                    placeholder="https://... วาง URL รูปตัวอย่าง"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                  />
                </div>
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-pink-300 hover:text-pink-600 transition shrink-0"
                >
                  <ImagePlus className="size-3.5" /> Add
                </button>
              </div>
              {refImages.length > 0 && (
                <p className="text-[11px] text-emerald-600 mt-1.5">✓ {refImages.length} รูป — Hermes จะส่งไปให้ GPT-4o วิเคราะห์เมื่อสร้าง image prompt</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition"
              >
                <Check className="size-4" />
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button onClick={closeForm} className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
