import { SQLiteIcon } from '@/components/icons/brand-icons'
import { KnowledgeSourcesList, GoogleDriveSetup } from './KnowledgeSources'

export default function RagPage() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH ?? null
  const ragPath = process.env.RAG_INDEX_PATH ?? null

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>RAG / Knowledge</h1>
        <p className="text-sm text-gray-500 mt-1">Local knowledge base — SQLite FTS5 · Obsidian + URLs + Google Drive</p>
      </div>

      {/* ── Obsidian Vault ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>Obsidian Vault</span>
        </h2>

        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <ConfigRow
              label="OBSIDIAN_VAULT_PATH"
              value={vaultPath}
              placeholder="ยังไม่ได้ตั้งค่า — ใส่ใน .env.local"
              ok={!!vaultPath}
            />
            <ConfigRow
              label="RAG_INDEX_PATH"
              value={ragPath}
              placeholder="rag/index.db (default)"
              ok
            />
          </div>
        </div>

        <div className="card p-6 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How to Index Vault</h3>
          <ol className="space-y-3">
            {[
              <>ตั้งค่า <Code>OBSIDIAN_VAULT_PATH</Code> ใน <Code>.env.local</Code> ให้ชี้ไปที่โฟลเดอร์ Obsidian vault</>,
              <>รันคำสั่ง: <Code>pnpm rag:index</Code> — จะสร้าง SQLite FTS5 index จาก markdown notes ทั้งหมด</>,
              <>Hermes จะค้น RAG อัตโนมัติเมื่อประมวลผล requirement โดยใช้ keyword search</>,
              <>อัปเดต index เมื่อเพิ่ม notes ใน Obsidian โดยรัน <Code>pnpm rag:index</Code> ใหม่</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="size-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── URL Sources ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">URL Sources</h2>
        <p className="text-sm text-slate-500">เพิ่ม URL เว็บไซต์หรือ Google Docs link — ระบบจะ fetch และ index เนื้อหาเข้า RAG อัตโนมัติ</p>

        <div className="card p-6">
          <KnowledgeSourcesList />
        </div>
      </section>

      {/* ── Google Drive Folder ────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Google Drive</h2>
        <p className="text-sm text-slate-500">
          เชื่อมต่อ Google Drive folder โดยใช้ Service Account — ระบบจะดึงรายชื่อไฟล์จาก folder มาให้เลือก index
        </p>
        <GoogleDriveSetup />
      </section>

      {/* Tech note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <SQLiteIcon className="size-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          RAG ใน MVP ใช้ <strong>SQLite FTS5 keyword search</strong> — ไม่ใช้ vector embeddings
          ซึ่งช่วยให้รันได้ local 100% โดยไม่ต้องพึ่ง OpenAI embeddings API หรือ pgvector
        </p>
      </div>
    </div>
  )
}

function ConfigRow({
  label, value, placeholder, ok,
}: {
  label: string; value: string | null; placeholder: string; ok: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div>
        <p className="text-xs font-semibold text-slate-500 font-mono">{label}</p>
        <code className="text-xs text-slate-700 font-mono mt-1 block">{value ?? placeholder}</code>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 mt-0.5 ${ok && value ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {ok && value ? 'Set' : 'Not set'}
      </span>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-slate-700">
      {children}
    </code>
  )
}
