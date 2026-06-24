import type { CommandLog } from '@/types'

async function getLogs(): Promise<CommandLog[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/command-logs`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function LogsPage() {
  const logs = await getLogs()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#111827' }}>Logs</h1>
        <p className="text-sm text-gray-500 mt-1">{logs.length} command logs</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Source</th>
              <th className="th">Command</th>
              <th className="th">Status</th>
              <th className="th">Response</th>
              <th className="th">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  ยังไม่มี logs
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                      {log.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600 max-w-xs truncate">
                    {log.command_text}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        log.status === 'ok'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                    {log.response_text ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('th-TH')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
