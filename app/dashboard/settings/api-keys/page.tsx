'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
const TIMEZONES = ['Asia/Bangkok', 'Asia/Singapore', 'UTC']

export default function ApiKeysPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  useEffect(() => {
    fetch('/api/local/app-settings')
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }))

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/local/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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

  async function testOpenAI() {
    setTesting(true)
    setTestResult(null)
    try {
      await handleSave()
      const res = await fetch('/api/ai/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ law_categories: ['กฎหมายทั่วไป'], hint: '', count: 1 }),
      })
      setTestResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  const maskedKey = settings.openai_api_key
    ? settings.openai_api_key.startsWith('sk-') && settings.openai_api_key.length > 12
      ? `sk-...${settings.openai_api_key.slice(-6)}`
      : settings.openai_api_key
    : ''

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading…</div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <a href="/dashboard/settings" className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium">← Settings</a>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
              API Keys & Config
            </h1>
            <p className="text-sm text-slate-500 mt-1">ตั้งค่า OpenAI และระบบ Hermes</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition shrink-0">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* OpenAI */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100" style={{ borderLeftWidth: 3, borderLeftColor: '#10B981', borderLeftStyle: 'solid' }}>
          <h2 className="text-sm font-bold text-slate-800">OpenAI</h2>
          <p className="text-xs text-slate-400 mt-0.5">ใช้สำหรับ content generation, image prompt, และ AI topic suggestions</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">API Key</label>
            <div className="relative">
              <input
                className={`${inputCls} pr-24`}
                type={showKey ? 'text' : 'password'}
                value={settings.openai_api_key ?? ''}
                onChange={e => set('openai_api_key', e.target.value)}
                placeholder="sk-..."
              />
              <button type="button" onClick={() => setShowKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {!showKey && settings.openai_api_key && (
              <p className="text-xs text-slate-400 font-mono">{maskedKey}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Model</label>
            <div className="flex flex-wrap gap-2">
              {MODELS.map(m => (
                <button key={m} type="button" onClick={() => set('openai_model', m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all ${settings.openai_model === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={testOpenAI} disabled={testing || !settings.openai_api_key}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition disabled:opacity-40">
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            {testResult === 'ok' && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle className="size-4" />Connected</span>}
            {testResult === 'fail' && <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500"><XCircle className="size-4" />Failed — ตรวจสอบ API key</span>}
          </div>
        </div>
      </div>

      {/* Hermes */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100" style={{ borderLeftWidth: 3, borderLeftColor: '#8B5CF6', borderLeftStyle: 'solid' }}>
          <h2 className="text-sm font-bold text-slate-800">Hermes Worker</h2>
          <p className="text-xs text-slate-400 mt-0.5">ตั้งค่าการทำงานของ background worker</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Poll Interval (วินาที)</label>
              <input type="number" className={inputCls} value={settings.hermes_poll_interval ?? '45'} min={10} max={300}
                onChange={e => set('hermes_poll_interval', e.target.value)} />
              <p className="text-xs text-slate-400">Hermes ตรวจ queue ทุกกี่วินาที (default: 45)</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Timezone</label>
              <select className={inputCls} value={settings.default_timezone ?? 'Asia/Bangkok'} onChange={e => set('default_timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Hermes Persona / System Prompt</label>
            <textarea
              className={`${inputCls} min-h-[120px] resize-y font-mono text-xs`}
              value={settings.hermes_system_prompt ?? ''}
              onChange={e => set('hermes_system_prompt', e.target.value)}
              placeholder={'คุณเป็น content writer ประจำสำนักงานกฎหมาย [ชื่อสำนักงาน]\nเขียนภาษาไทยที่เข้าใจง่าย ถูกต้อง และ engage กลุ่มเป้าหมาย\nใช้ข้อมูลจาก RAG vault เป็นหลัก ห้ามอ้างกฎหมายที่ไม่แน่ใจ'}
            />
            <p className="text-xs text-slate-400">Inject เป็น system context ของทุก OpenAI call — ถ้าว่างจะใช้ default persona ของ Hermes</p>
          </div>
        </div>
      </div>

      {/* Content Defaults */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100" style={{ borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderLeftStyle: 'solid' }}>
          <h2 className="text-sm font-bold text-slate-800">Content Defaults</h2>
          <p className="text-xs text-slate-400 mt-0.5">ค่า default สำหรับ Requirement ใหม่</p>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Default Word Count</label>
            <input type="number" className={inputCls} value={settings.default_word_count ?? '1000'} min={300} max={3000} step={100}
              onChange={e => set('default_word_count', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">Default Content Type</label>
            <select className={inputCls} value={settings.default_content_type ?? 'post'} onChange={e => set('default_content_type', e.target.value)}>
              <option value="post">Single Post</option>
              <option value="carousel">Carousel</option>
              <option value="reel_script">Reels</option>
              <option value="short_video">Short Video</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
