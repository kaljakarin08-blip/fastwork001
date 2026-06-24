'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-colors'

type Step = 'welcome' | 'apikey' | 'brand' | 'done'

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [saving, setSaving] = useState(false)

  // Skip setup if already configured
  useEffect(() => {
    fetch('/api/local/app-settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.openai_api_key && data.setup_complete === '1') {
          router.replace('/dashboard')
        }
      })
      .catch(() => null)
  }, [router])

  async function saveApiKey() {
    setSaving(true)
    try {
      await fetch('/api/local/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: apiKey, openai_model: 'gpt-4o' }),
      })
      setStep('brand')
    } finally {
      setSaving(false)
    }
  }

  async function testKey() {
    setTesting(true)
    setTestResult(null)
    try {
      await fetch('/api/local/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: apiKey }),
      })
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

  async function saveBrandAndFinish() {
    setSaving(true)
    try {
      if (firmName.trim()) {
        await fetch('/api/local/brand-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firm_name: firmName.trim() }),
        })
      }
      await fetch('/api/local/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_complete: '1' }),
      })
      setStep('done')
      setTimeout(() => router.replace('/dashboard'), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
            <span className="text-2xl font-black" style={{ color: '#0F172A' }}>L</span>
          </div>
          <h1 className="text-xl font-bold text-white">Law AI Content OS</h1>
          <p className="text-sm text-slate-400 mt-1">ตั้งค่าครั้งแรก</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'apikey', 'brand', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                s === step ? 'bg-amber-400 scale-125' :
                ['welcome','apikey','brand','done'].indexOf(step) > i ? 'bg-amber-400/60' : 'bg-slate-600'
              }`} />
              {i < 3 && <div className="w-6 h-px bg-slate-600" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 backdrop-blur p-8">

          {step === 'welcome' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">ยินดีต้อนรับ</h2>
                <p className="text-sm text-slate-400 mt-1">ใช้เวลาไม่ถึง 2 นาทีในการตั้งค่า</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🔑', title: 'ตั้งค่า OpenAI API Key', desc: 'ใช้สำหรับสร้างคอนเทนต์' },
                  { icon: '🏢', title: 'กรอกชื่อสำนักงาน', desc: 'ปรากฎในคอนเทนต์ทุกชิ้น' },
                  { icon: '🚀', title: 'เริ่มสร้างคอนเทนต์', desc: 'Hermes พร้อมทำงานทันที' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-700/50">
                    <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep('apikey')}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0F172A' }}>
                เริ่มต้น <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {step === 'apikey' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">OpenAI API Key</h2>
                <p className="text-sm text-slate-400 mt-1">
                  หา key ได้ที่ <span className="text-amber-400 font-mono text-xs">platform.openai.com/api-keys</span>
                </p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    className={inputCls + ' !bg-slate-700 !border-slate-600 !text-white !placeholder-slate-500 pr-10'}
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
                    placeholder="sk-..."
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <button onClick={testKey} disabled={!apiKey || testing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 hover:border-amber-500 hover:text-amber-400 transition disabled:opacity-40">
                  {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                  {testing ? 'กำลังทดสอบ…' : 'ทดสอบ API Key'}
                </button>

                {testResult === 'ok' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle className="size-4" /> เชื่อมต่อสำเร็จ
                  </div>
                )}
                {testResult === 'fail' && (
                  <p className="text-red-400 text-sm">Key ไม่ถูกต้อง หรือไม่มี credit — กรุณาตรวจสอบ</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('welcome')}
                  className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition">
                  ย้อนกลับ
                </button>
                <button onClick={saveApiKey} disabled={!apiKey || saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0F172A' }}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  ถัดไป <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'brand' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">ข้อมูลสำนักงาน</h2>
                <p className="text-sm text-slate-400 mt-1">ใช้สร้าง brand voice ในคอนเทนต์ (แก้ไขได้ภายหลัง)</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide text-slate-400 uppercase block">ชื่อสำนักงาน</label>
                  <input
                    className={inputCls + ' !bg-slate-700 !border-slate-600 !text-white !placeholder-slate-500'}
                    value={firmName}
                    onChange={e => setFirmName(e.target.value)}
                    placeholder="เช่น สำนักงานกฎหมาย พงษ์ศักดิ์ แอนด์ พาร์ทเนอร์ส"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500">ถ้าข้ามจะตั้งค่าได้ใน Settings → Brand Profile</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('apikey')}
                  className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition">
                  ย้อนกลับ
                </button>
                <button onClick={saveBrandAndFinish} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0F172A' }}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  เริ่มใช้งาน
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="size-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">พร้อมแล้ว!</h2>
                <p className="text-sm text-slate-400 mt-1">กำลังเข้าสู่ Dashboard…</p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="size-5 text-amber-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          ข้อมูลทั้งหมดเก็บไว้ในเครื่องของคุณ ไม่มีการส่งออก
        </p>
      </div>
    </div>
  )
}
