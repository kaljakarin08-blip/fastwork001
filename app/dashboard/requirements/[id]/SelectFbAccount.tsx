'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { FacebookAccount } from '@/types'

export default function SelectFbAccount({
  requirementId,
  fbAccounts,
  currentAccountId,
}: {
  requirementId: string
  fbAccounts: FacebookAccount[]
  currentAccountId: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentAccountId ?? '')
  const [saving, setSaving] = useState(false)

  if (fbAccounts.length === 0) return null

  async function save(id: string) {
    setSaving(true)
    await fetch(`/api/local/requirements/${requirementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facebook_account_id: id || null }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 transition"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value)
          save(e.target.value)
        }}
      >
        <option value="">— เลือก Facebook Page —</option>
        {fbAccounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.page_name}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="size-3.5 animate-spin text-slate-400" />}
    </div>
  )
}
