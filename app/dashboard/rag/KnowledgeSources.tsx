'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trash2, Loader2, Link2, HardDrive, Eye, EyeOff, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-colors'

interface KnowledgeSource {
  id: string
  type: string
  name: string
  source_url: string
  status: 'pending' | 'indexing' | 'indexed' | 'error'
  chunk_count: number
  error_message?: string
  last_indexed_at?: string
  created_at: string
}

function StatusBadge({ status }: { status: KnowledgeSource['status'] }) {
  if (status === 'indexed') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle className="size-3" /> Indexed
    </span>
  )
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertCircle className="size-3" /> Error
    </span>
  )
  if (status === 'indexing') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
      <Loader2 className="size-3 animate-spin" /> Indexing…
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
      <Clock className="size-3" /> Pending
    </span>
  )
}

// ─── URL + Google Drive source list ──────────────────────────────────────────

export function KnowledgeSourcesList() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [indexingId, setIndexingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/local/rag/sources')
    if (res.ok) setSources(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const isGdrive = url.includes('drive.google.com') || url.includes('docs.google.com')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/local/rag/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || url, source_url: url }),
      })
      if (!res.ok) throw new Error(await res.text())
      setName(''); setUrl(''); setShowAdd(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleIndex(id: string) {
    setIndexingId(id)
    setError('')
    try {
      const res = await fetch('/api/local/rag/index-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; chunks?: number }
      if (!res.ok) throw new Error(json.error ?? 'Index failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIndexingId(null)
      await load()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบ source นี้?')) return
    await fetch('/api/local/rag/sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  return (
    <div className="space-y-4">
      {/* Add form trigger */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sources.length} sources</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {showAdd ? '✕ Cancel' : <><Plus className="size-3.5" /> Add URL</>}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              URL <span className="font-normal text-gray-400">(เว็บไซต์, Google Docs, Google Drive file)</span>
            </label>
            <input
              className={inputCls}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.samuiforsale.com/thai-law/... หรือ https://docs.google.com/document/d/..."
              required
            />
            {isGdrive && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <HardDrive className="size-3" /> Google Drive/Docs ตรวจพบ — จะ export เป็น text อัตโนมัติ
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">ชื่อ (optional)</label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="เช่น พระราชบัญญัติคุ้มครองแรงงาน 2541"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="btn-gold disabled:opacity-50 text-xs flex items-center gap-1.5">
              {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {adding ? 'Adding…' : 'Add Source'}
            </button>
          </div>
        </form>
      )}

      {/* Source list */}
      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          ยังไม่มี sources — เพิ่ม URL หรือ Google Drive link ด้านบน
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map(src => (
            <div key={src.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {src.type === 'gdrive'
                    ? <HardDrive className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    : <Link2 className="size-4 text-gray-400 shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{src.name}</p>
                    <a href={src.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block max-w-xs">
                      {src.source_url}
                    </a>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={src.status} />
                      {src.status === 'indexed' && (
                        <span className="text-xs text-gray-400">{src.chunk_count} chunks</span>
                      )}
                      {src.last_indexed_at && (
                        <span className="text-xs text-gray-400">
                          · {new Date(src.last_indexed_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {src.error_message && (
                      <p className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-1">{src.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleIndex(src.id)}
                    disabled={indexingId === src.id}
                    title="Index / Re-index"
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {indexingId === src.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <RefreshCw className="size-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(src.id)}
                    title="Remove"
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Google Drive Folder Setup ────────────────────────────────────────────────

export function GoogleDriveSetup() {
  const [open, setOpen] = useState(false)
  const [folderId, setFolderId] = useState('')
  const [email, setEmail] = useState('')
  const [keyJson, setKeyJson] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/local/rag/index-gdrive').then(r => r.json()).then((cfg: Record<string, string>) => {
      if (cfg.gdrive_folder_id) setFolderId(cfg.gdrive_folder_id)
      if (cfg.gdrive_service_account_email) setEmail(cfg.gdrive_service_account_email)
    }).catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(''); setError('')
    try {
      const res = await fetch('/api/local/rag/index-gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-config',
          gdrive_folder_id: folderId,
          gdrive_service_account_email: email,
          ...(keyJson ? { gdrive_service_account_key: keyJson } : {}),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMsg('บันทึกแล้ว')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true); setMsg(''); setError('')
    try {
      const res = await fetch('/api/local/rag/index-gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; files_found?: number; files?: string[] }
      if (!res.ok) throw new Error(json.error ?? 'Sync failed')
      setMsg(`พบ ${json.files_found} ไฟล์: ${json.files?.slice(0, 5).join(', ')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HardDrive className="size-4 text-blue-500" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Google Drive Folder Sync</p>
            <p className="text-xs text-gray-400">{folderId ? `Folder: ${folderId.slice(0, 20)}…` : 'ยังไม่ตั้งค่า'}</p>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* Instructions */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 space-y-2">
            <p className="font-semibold">วิธีตั้งค่า Google Drive Folder Sync:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>ไปที่ <strong>Google Cloud Console</strong> → IAM &amp; Admin → Service Accounts → Create</li>
              <li>ดาวน์โหลด JSON key file ของ service account</li>
              <li>เปิด Google Drive folder ที่ต้องการ → Share → ใส่ service account email</li>
              <li>นำ Folder ID (จาก URL) และ JSON key มาใส่ด้านล่าง</li>
            </ol>
            <p className="text-blue-600">หรือใช้แบบง่าย: เพิ่มแต่ละ Google Doc link ใน URL Sources ด้านบนแทนได้เลย</p>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Google Drive Folder ID</label>
              <input
                className={inputCls}
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              />
              <p className="text-[11px] text-gray-400">ดูได้จาก URL ของ folder: drive.google.com/drive/folders/<strong>THIS_PART</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Service Account Email</label>
              <input
                className={inputCls}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="my-bot@my-project.iam.gserviceaccount.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Service Account JSON Key</label>
              <div className="relative">
                <textarea
                  className={`${inputCls} min-h-[80px] resize-y font-mono text-xs pr-10`}
                  value={showKey ? keyJson : (keyJson ? '••••••••••••••' : '')}
                  onChange={e => { if (showKey) setKeyJson(e.target.value) }}
                  placeholder={showKey ? '{"type":"service_account","project_id":...}' : 'คลิก 👁 เพื่อแก้ไข'}
                  readOnly={!showKey}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">เก็บใน DB local เท่านั้น ไม่ส่งออก</p>
            </div>

            {msg && <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</p>}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50 text-xs flex items-center gap-1.5">
                {saving ? <Loader2 className="size-3 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Config'}
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !folderId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
