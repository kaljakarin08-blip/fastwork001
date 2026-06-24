'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Building2, Globe, Phone, Mail, MessageSquare, Palette } from 'lucide-react'
import type { BrandProfile } from '@/types'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors'

const TONES = ['professional', 'friendly', 'educational', 'authoritative', 'conversational', 'storytelling']

export default function BrandProfilePage() {
  const [form, setForm] = useState<Partial<BrandProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/local/brand-profile')
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: keyof BrandProfile, value: string) => setForm(f => ({ ...f, [key]: value }))

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/local/brand-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading…</div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <a href="/dashboard/settings" className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium">← Settings</a>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
              Brand Profile
            </h1>
            <p className="text-sm text-slate-500 mt-1">ข้อมูลสำนักงาน — ใช้ใน content generation และ image prompt</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition shrink-0"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Identity */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2" style={{ borderLeftWidth: 3, borderLeftColor: '#D97706', borderLeftStyle: 'solid' }}>
          <Building2 className="size-4 text-orange-500" />
          <h2 className="text-sm font-bold text-slate-800">ข้อมูลสำนักงาน</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">ชื่อสำนักงาน</label>
              <input className={inputCls} value={form.firm_name ?? ''} onChange={e => set('firm_name', e.target.value)} placeholder="เช่น สำนักงานกฎหมายสมชาย แอนด์ พาร์ทเนอร์ส" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Tagline</label>
              <input className={inputCls} value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="เช่น กฎหมายที่คุณไว้ใจได้" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Logo URL</label>
            <input className={inputCls} value={form.logo_url ?? ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
            {form.logo_url && form.logo_url.startsWith('http') && (
              <img src={form.logo_url} alt="logo preview" className="mt-2 h-16 w-auto rounded-lg border border-slate-200 object-contain bg-slate-50 p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Facebook Bio</label>
            <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.facebook_bio ?? ''} onChange={e => set('facebook_bio', e.target.value)} placeholder="คำอธิบายสั้นๆ สำหรับ Facebook Page" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">ที่อยู่</label>
            <textarea className={`${inputCls} min-h-[56px] resize-y`} value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2" style={{ borderLeftWidth: 3, borderLeftColor: '#3B82F6', borderLeftStyle: 'solid' }}>
          <Phone className="size-4 text-blue-500" />
          <h2 className="text-sm font-bold text-slate-800">ช่องทางติดต่อ</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
              <Phone className="size-3" />โทรศัพท์
            </label>
            <input className={inputCls} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="02-xxx-xxxx" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
              <Mail className="size-3" />อีเมล
            </label>
            <input className={inputCls} value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="contact@lawfirm.co.th" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
              <MessageSquare className="size-3" />LINE ID
            </label>
            <input className={inputCls} value={form.line_id ?? ''} onChange={e => set('line_id', e.target.value)} placeholder="@lawfirm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
              <Globe className="size-3" />เว็บไซต์
            </label>
            <input className={inputCls} value={form.website_url ?? ''} onChange={e => set('website_url', e.target.value)} placeholder="https://lawfirm.co.th" />
          </div>
        </div>
      </div>

      {/* Brand Style */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2" style={{ borderLeftWidth: 3, borderLeftColor: '#EC4899', borderLeftStyle: 'solid' }}>
          <Palette className="size-4 text-pink-500" />
          <h2 className="text-sm font-bold text-slate-800">Brand Style</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-12 rounded border border-slate-200 cursor-pointer p-0.5" value={form.primary_color ?? '#1e3a5f'} onChange={e => set('primary_color', e.target.value)} />
                <input className={inputCls} value={form.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} placeholder="#1e3a5f" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-12 rounded border border-slate-200 cursor-pointer p-0.5" value={form.secondary_color ?? '#d4a853'} onChange={e => set('secondary_color', e.target.value)} />
                <input className={inputCls} value={form.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} placeholder="#d4a853" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Default Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => set('default_tone', t)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${form.default_tone === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">กลุ่มเป้าหมายหลัก</label>
            <input className={inputCls} value={form.default_target_audience ?? ''} onChange={e => set('default_target_audience', e.target.value)} placeholder="เช่น เจ้าของธุรกิจ SME ที่ต้องการปรึกษากฎหมาย" />
          </div>
        </div>
      </div>
    </div>
  )
}
