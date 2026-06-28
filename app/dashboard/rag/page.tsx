'use client'

import { useState, useEffect, useCallback } from 'react'

const LAW_CATEGORIES = [
  'กฎหมายบริษัท', 'ภาษีและบัญชี', 'อสังหาริมทรัพย์', 'แรงงาน',
  'สัญญา', 'อาญา', 'ครอบครัว/มรดก', 'ทรัพย์สินทางปัญญา',
  'คดีความ/ฟ้องร้อง', 'การเงิน/หลักทรัพย์', 'วีซ่า/คนเข้าเมือง', 'สิ่งแวดล้อม/ผังเมือง',
]

type KnowledgeSource = {
  id: string
  name: string
  source_url: string
  type: string
  law_category: string | null
  status: 'pending' | 'indexing' | 'indexed' | 'error'
  chunk_count: number
  error_message: string | null
  last_indexed_at: string | null
  created_at: string
}

type SearchResult = {
  path: string
  title: string
  content: string
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-500',
    indexing: 'bg-blue-100 text-blue-700',
    indexed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-600',
  }
  return `text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? 'bg-slate-100 text-slate-500'}`
}

export default function RagPage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [addMode, setAddMode] = useState<'url' | 'pdf'>('url')
  const [form, setForm] = useState({ name: '', source_url: '', law_category: '' })
  const [pdfForm, setPdfForm] = useState({ name: '', law_category: '', file: null as File | null })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [indexingId, setIndexingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const loadSources = useCallback(async () => {
    const res = await fetch('/api/local/rag/sources', { cache: 'no-store' })
    const data = await res.json()
    if (Array.isArray(data)) setSources(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadSources() }, [loadSources])

  async function addSource(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.source_url.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/local/rag/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, source_url: form.source_url, law_category: form.law_category || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm({ name: '', source_url: '', law_category: '' })
      await loadSources()
    } catch (err) {
      setAddError(String(err))
    }
    setAdding(false)
  }

  async function addPdf(e: React.FormEvent) {
    e.preventDefault()
    if (!pdfForm.name.trim() || !pdfForm.file) return
    setAdding(true)
    setAddError('')
    try {
      const fd = new FormData()
      fd.append('file', pdfForm.file)
      fd.append('name', pdfForm.name)
      if (pdfForm.law_category) fd.append('law_category', pdfForm.law_category)
      const res = await fetch('/api/local/rag/upload-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPdfForm({ name: '', law_category: '', file: null })
      await loadSources()
    } catch (err) {
      setAddError(String(err))
    }
    setAdding(false)
  }

  async function indexSource(id: string) {
    setIndexingId(id)
    try {
      await fetch('/api/local/rag/index-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await loadSources()
    } catch { /* ignore */ }
    setIndexingId(null)
  }

  async function deleteSource(id: string) {
    setDeletingId(id)
    try {
      await fetch('/api/local/rag/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await loadSources()
    } catch { /* ignore */ }
    setDeletingId(null)
  }

  async function search() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/local/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      })
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setSearching(false)
  }

  const totalChunks = sources.reduce((s, x) => s + (x.chunk_count ?? 0), 0)
  const indexed = sources.filter(s => s.status === 'indexed').length

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>
          RAG / Knowledge
        </h1>
        <p className="text-sm text-slate-400 mt-1">แหล่งความรู้สำหรับ Hermes AI — URL sources และ knowledge base</p>
      </div>

      {/* Re-index reminder */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 text-base shrink-0 mt-0.5">💡</span>
        <div>
          <p className="text-xs font-semibold text-amber-800">เมื่อมีกฎหมายใหม่หรือข้อมูลอัปเดต</p>
          <p className="text-xs text-amber-700 mt-0.5">กด <span className="font-bold">🔄 Re-index</span> ที่ URL source นั้น เพื่อให้ Hermes AI ใช้ข้อมูลล่าสุดในการสร้าง content</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sources ทั้งหมด', value: sources.length },
          { label: 'Indexed แล้ว', value: indexed },
          { label: 'Chunks ทั้งหมด', value: totalChunks.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="card p-5 text-center">
            <div className="text-3xl font-bold text-orange-600">{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Source — URL or PDF */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="text-lg">{addMode === 'url' ? '🔗' : '📄'}</span>
            เพิ่ม Knowledge Source
          </h2>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAddMode('url'); setAddError('') }}
              className={`px-3 py-1.5 transition-colors ${addMode === 'url' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              🔗 URL
            </button>
            <button
              type="button"
              onClick={() => { setAddMode('pdf'); setAddError('') }}
              className={`px-3 py-1.5 transition-colors ${addMode === 'pdf' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              📄 PDF
            </button>
          </div>
        </div>

        {addMode === 'url' ? (
          <form onSubmit={addSource} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="ชื่อ เช่น ค่าจ้างขั้นต่ำ 2567"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className={inputCls}
                placeholder="https://... (HTML หรือ PDF URL)"
                value={form.source_url}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                type="url"
                required
              />
            </div>
            <select
              className={inputCls}
              value={form.law_category}
              onChange={e => setForm(f => ({ ...f, law_category: e.target.value }))}
            >
              <option value="">— หมวดหมู่กฎหมาย (ระบุเพื่อให้ AI ใช้อัตโนมัติ) —</option>
              {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-[11px] text-slate-400">
              💡 รองรับทั้ง HTML และ PDF URL — ถ้าเลือก category Hermes จะ fetch อัตโนมัติเมื่อสร้าง content ในหมวดนั้น
            </p>
            {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
            <button type="submit" disabled={adding} className="btn-primary text-sm disabled:opacity-50">
              {adding ? 'กำลังเพิ่ม…' : '+ เพิ่ม URL'}
            </button>
          </form>
        ) : (
          <form onSubmit={addPdf} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="ชื่อ เช่น คู่มือ BOI 2567"
                value={pdfForm.name}
                onChange={e => setPdfForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <select
                className={inputCls}
                value={pdfForm.law_category}
                onChange={e => setPdfForm(f => ({ ...f, law_category: e.target.value }))}
              >
                <option value="">— หมวดหมู่กฎหมาย —</option>
                {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Drop zone */}
            <label className={`relative flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-all border-2 border-dashed
              ${pdfForm.file
                ? 'border-orange-400 bg-orange-50 py-4'
                : 'border-slate-200 hover:border-orange-400 hover:bg-orange-50 py-8'
              }`}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => setPdfForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
              {pdfForm.file ? (
                <div className="flex items-center gap-3 px-4">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-700 truncate">{pdfForm.file.name}</p>
                    <p className="text-[11px] text-slate-400">{(pdfForm.file.size / 1024).toFixed(0)} KB — คลิกเพื่อเปลี่ยนไฟล์</p>
                  </div>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">พร้อม</span>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-3xl">📂</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">คลิกเพื่อเลือกไฟล์ PDF</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">หรือ drag & drop มาที่นี่ — สูงสุด 10MB</p>
                  </div>
                </div>
              )}
            </label>

            {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}

            <button
              type="submit"
              disabled={adding || !pdfForm.file || !pdfForm.name}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                enabled:bg-orange-500 enabled:text-white enabled:hover:bg-orange-600 enabled:shadow-sm enabled:hover:shadow-md"
            >
              {adding
                ? <span className="flex items-center justify-center gap-2">⏳ กำลัง extract และ index PDF…</span>
                : <span className="flex items-center justify-center gap-2">⬆️ Upload และ Index PDF</span>
              }
            </button>

            {!pdfForm.file && (
              <p className="text-[11px] text-slate-400 text-center">
                เลือกไฟล์ก่อน แล้วกดปุ่ม Upload ด้านบน
              </p>
            )}
          </form>
        )}
      </div>

      {/* Source List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">URL Sources</h2>
          <button onClick={loadSources} className="text-xs text-slate-400 hover:text-orange-600 transition-colors">
            รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">ยังไม่มี source — เพิ่ม URL ด้านบนเลยครับ</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sources.map(s => (
              <div key={s.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">{s.name}</span>
                    <span className={statusBadge(s.status)}>{s.status}</span>
                    {s.law_category && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                        ⚖️ {s.law_category}
                      </span>
                    )}
                    {s.chunk_count > 0 && (
                      <span className="text-xs text-slate-400">{s.chunk_count} chunks</span>
                    )}
                  </div>
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline truncate block mt-0.5 max-w-xs"
                  >
                    {s.source_url}
                  </a>
                  {s.error_message && (
                    <p className="text-xs text-red-500 mt-1 truncate">{s.error_message}</p>
                  )}
                  {s.last_indexed_at && (
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      indexed: {new Date(s.last_indexed_at).toLocaleString('th-TH')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => indexSource(s.id)}
                    disabled={indexingId === s.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition-all"
                  >
                    {indexingId === s.id ? 'กำลัง index…' : s.status === 'indexed' ? '🔄 Re-index' : '▶ Index'}
                  </button>
                  <button
                    onClick={() => deleteSource(s.id)}
                    disabled={deletingId === s.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-all"
                  >
                    {deletingId === s.id ? '…' : 'ลบ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Test */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="text-lg">🔍</span> ทดสอบ RAG Search
        </h2>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="พิมพ์คำค้นหา เช่น ลาคลอด, สัญญา, ภาษี"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            onClick={search}
            disabled={searching || !searchQuery.trim()}
            className="btn-primary text-sm disabled:opacity-50 shrink-0"
          >
            {searching ? 'กำลังค้น…' : 'ค้นหา'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3">
            {searchResults.map((r, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">#{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate">{r.title}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{r.path}</p>
                <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-xs text-slate-400 text-center py-2">ไม่พบผลลัพธ์</p>
        )}
      </div>

    </div>
  )
}
