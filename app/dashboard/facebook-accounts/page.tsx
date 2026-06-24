'use client'

import { useState, useEffect } from 'react'
import type { FacebookAccount } from '@/types'
import { FacebookCircleIcon } from '@/components/icons/brand-icons'
import { Eye, EyeOff, Pencil, Trash2, Check, X, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-colors'

const EMPTY_FORM = {
  account_name: '',
  page_name: '',
  page_id: '',
  page_access_token: '',
  token_expires_at: '',
  brand_voice: '',
  default_timezone: 'Asia/Bangkok',
  notes: '',
}
type FormState = typeof EMPTY_FORM

function SecretField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`${inputCls} pr-10`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        autoComplete="off"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

// ─── App Setup (App ID + Secret → OAuth connect) ─────────────────────────────

function AppSetupSection({ onConnected }: { onConnected: () => void }) {
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/local/facebook/app-config')
      .then(r => r.json())
      .then((d: { fb_app_id?: string; fb_app_secret?: string }) => {
        if (d.fb_app_id) setAppId(d.fb_app_id)
        if (d.fb_app_secret) setAppSecret(d.fb_app_secret)
      })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/local/facebook/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fb_app_id: appId, fb_app_secret: appSecret }),
    })
    setMsg('บันทึกแล้ว')
    setSaving(false)
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/60 flex items-center gap-3">
        <FacebookCircleIcon className="size-6 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">เชื่อมต่อ Facebook App</p>
          <p className="text-xs text-blue-600">ใส่ App ID + App Secret → กด Connect → เลือกเพจที่ต้องการ</p>
        </div>
      </div>
      <form onSubmit={save} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">App ID</label>
            <input className={inputCls} value={appId} onChange={e => setAppId(e.target.value)}
              placeholder="1234567890" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">App Secret</label>
            <SecretField value={appSecret} onChange={setAppSecret} placeholder="abc123..." />
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">วิธีหา App ID + App Secret:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>ไปที่ developers.facebook.com → My Apps → เลือก App ของคุณ</li>
            <li>Settings → Basic → คัดลอก <strong>App ID</strong> และ <strong>App Secret</strong></li>
            <li>ไปที่ Facebook Login → Settings → เพิ่ม Valid OAuth Redirect URI:<br />
              <code className="bg-amber-100 px-1 rounded font-mono">http://localhost:3000/api/local/facebook/callback</code>
            </li>
          </ol>
        </div>

        <div className="flex gap-3 items-center">
          <button type="submit" disabled={saving}
            className="btn-ghost flex items-center gap-2 text-xs disabled:opacity-50">
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            {saving ? 'Saving…' : 'Save'}
          </button>

          <a href="/api/local/facebook/connect"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166FE5] transition-colors shadow-sm">
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Connect with Facebook
          </a>

          {msg && <span className="text-xs text-emerald-600 font-medium">{msg}</span>}
        </div>
      </form>
    </div>
  )
}

// ─── Account Form (manual add / edit) ────────────────────────────────────────

function AccountForm({ initial, onSave, onCancel, isEdit }: {
  initial: FormState; onSave: (f: FormState) => Promise<void>; onCancel: () => void; isEdit?: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  function set(key: keyof FormState, v: string) { setForm(f => ({ ...f, [key]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try { await onSave(form) } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card overflow-hidden" style={{ borderColor: '#C9A227' }}>
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F5E6A8', background: '#FFFBEB' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#92751B' }}>
          {isEdit ? 'แก้ไข Facebook Account' : 'Add Account (manual)'}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="size-4" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Account Name *</label>
            <input className={inputCls} value={form.account_name} onChange={e => set('account_name', e.target.value)} required placeholder="ชื่อที่จำง่าย" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Page Name *</label>
            <input className={inputCls} value={form.page_name} onChange={e => set('page_name', e.target.value)} required placeholder="ชื่อ Facebook Page" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Page ID</label>
            <input className={inputCls} value={form.page_id} onChange={e => set('page_id', e.target.value)} placeholder="เช่น 123456789" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Brand Voice</label>
            <input className={inputCls} value={form.brand_voice} onChange={e => set('brand_voice', e.target.value)} placeholder="formal, friendly…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            Page Access Token
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">จำเป็น</span>
          </label>
          <SecretField value={form.page_access_token} onChange={v => set('page_access_token', v)} placeholder="EAAxxxxx..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Token Expires At</label>
            <input type="date" className={inputCls} value={form.token_expires_at} onChange={e => set('token_expires_at', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Timezone</label>
            <input className={inputCls} value={form.default_timezone} onChange={e => set('default_timezone', e.target.value)} placeholder="Asia/Bangkok" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Notes</label>
          <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="หมายเหตุ" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50 flex items-center gap-2">
            {loading ? 'Saving...' : <><Check className="size-3.5" /> {isEdit ? 'บันทึกการแก้ไข' : 'Save Account'}</>}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </form>
  )
}

// ─── Notifications from OAuth callback ───────────────────────────────────────

function OAuthNotice({ onDone }: { onDone: () => void }) {
  const params = useSearchParams()
  const connected = params.get('connected')
  const error = params.get('error')

  if (!connected && !error) return null

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 ${
      connected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      <span>
        {connected ? `✅ เชื่อมต่อสำเร็จ — พบ ${connected} เพจ` : `❌ ${error}`}
      </span>
      <button onClick={onDone} className="shrink-0 text-xs underline opacity-70 hover:opacity-100">
        ปิด
      </button>
    </div>
  )
}

// ─── Verify Token button ─────────────────────────────────────────────────────

function VerifyButton({ accountId }: { accountId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [msg, setMsg] = useState('')

  async function verify() {
    setState('loading'); setMsg('')
    try {
      const res = await fetch(`/api/local/facebook/verify?account_id=${accountId}`)
      const json = await res.json() as {
        ok: boolean; page_name?: string; fan_count?: number; token_type?: string;
        token_scopes?: string[]; token_expires?: string; error?: string
      }
      if (json.ok) {
        setState('ok')
        setMsg(`✅ ${json.page_name} · ${json.token_type} · expires: ${json.token_expires?.slice(0,10) ?? 'never'} · scopes: ${json.token_scopes?.join(', ')}`)
      } else {
        setState('fail'); setMsg(`❌ ${json.error}`)
      }
    } catch (err) {
      setState('fail'); setMsg(String(err))
    }
  }

  return (
    <div className="space-y-1.5">
      <button onClick={verify} disabled={state === 'loading'}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
        {state === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
        Verify
      </button>
      {msg && (
        <p className={`text-[11px] rounded-lg px-2.5 py-1.5 border ${state === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FacebookAccountsPage() {
  const [accounts, setAccounts] = useState<FacebookAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState(true)

  async function load() {
    const res = await fetch('/api/local/facebook-accounts')
    if (res.ok) setAccounts(await res.json())
  }

  useEffect(() => { load() }, [])

  async function handleAdd(form: FormState) {
    const res = await fetch('/api/local/facebook-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error(await res.text())
    setShowAddForm(false); load()
  }

  async function handleEdit(id: string, form: FormState) {
    const res = await fetch(`/api/local/facebook-accounts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error(await res.text())
    setEditingId(null); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบ account นี้?')) return
    await fetch(`/api/local/facebook-accounts/${id}`, { method: 'DELETE' })
    load()
  }

  function toForm(fa: FacebookAccount): FormState {
    return {
      account_name: fa.account_name ?? '',
      page_name: fa.page_name ?? '',
      page_id: fa.page_id ?? '',
      page_access_token: fa.page_access_token ?? '',
      token_expires_at: fa.token_expires_at ?? '',
      brand_voice: fa.brand_voice ?? '',
      default_timezone: fa.default_timezone ?? 'Asia/Bangkok',
      notes: fa.notes ?? '',
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>FB Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} title="Refresh" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            <RefreshCw className="size-4" />
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }} className="btn-ghost text-sm">
            {showAddForm ? '✕ Cancel' : '+ Manual'}
          </button>
        </div>
      </div>

      {/* OAuth result notice */}
      {notice && (
        <Suspense>
          <OAuthNotice onDone={() => { setNotice(false); load() }} />
        </Suspense>
      )}

      {/* App Setup → OAuth connect */}
      <AppSetupSection onConnected={load} />

      {/* Manual add form */}
      {showAddForm && (
        <AccountForm initial={EMPTY_FORM} onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Accounts list */}
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-400 text-sm">ยังไม่มี Facebook accounts</p>
            <p className="text-slate-400 text-xs mt-1">กด Connect with Facebook ด้านบนเพื่อดึงเพจอัตโนมัติ</p>
          </div>
        ) : (
          accounts.map((fa) => (
            <div key={fa.id} className="card overflow-hidden">
              {editingId === fa.id ? (
                <AccountForm initial={toForm(fa)} onSave={(f) => handleEdit(fa.id, f)} onCancel={() => setEditingId(null)} isEdit />
              ) : (
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <FacebookCircleIcon className="size-10 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{fa.account_name}</p>
                      <p className="text-sm text-gray-500">
                        {fa.page_name}
                        {fa.page_id ? (
                          <code className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-400">ID: {fa.page_id}</code>
                        ) : (
                          <span className="ml-2 text-xs text-amber-500">ยังไม่มี Page ID</span>
                        )}
                      </p>
                      {fa.page_access_token ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-emerald-600 font-medium">Token ตั้งค่าแล้ว</span>
                          {fa.token_expires_at && <span className="text-xs text-gray-400">· หมดอายุ {fa.token_expires_at}</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-red-400" />
                          <span className="text-xs text-red-500 font-medium">ยังไม่มี Token — กด Connect ด้านบน</span>
                        </div>
                      )}
                      {fa.brand_voice && <p className="text-xs text-slate-400">Voice: {fa.brand_voice}</p>}
                      {fa.notes && <p className="text-xs text-slate-400">{fa.notes}</p>}
                      <VerifyButton accountId={fa.id} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setEditingId(fa.id); setShowAddForm(false) }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      <Pencil className="size-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(fa.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
