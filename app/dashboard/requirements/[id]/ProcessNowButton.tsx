'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProcessNowButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function run() {
    setLoading(true)
    await fetch('/api/hermes/run')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-10 text-center">
      <p className="text-slate-400 text-sm mb-4">ยังไม่มี output</p>
      <button
        onClick={run}
        disabled={loading}
        className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
      >
        {loading ? 'กำลังประมวลผล…' : '▶ Process Now'}
      </button>
    </div>
  )
}
