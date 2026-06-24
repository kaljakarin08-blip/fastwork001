import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// --- Auto-discover running dev server ---
async function findRunningServer(): Promise<string | null> {
  const candidates = [3000, 3001, 3002, 3003, 3004, 3005]
  for (const port of candidates) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(800),
      })
      if (res.ok) {
        const json = await res.json() as { ok?: boolean }
        if (json.ok) return `http://localhost:${port}`
      }
    } catch {
      // port not responding — try next
    }
  }
  return null
}

// --- API helpers ---
async function api(base: string, path: string, opts?: RequestInit): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// --- Main ---
const server = new Server(
  { name: 'law-content-v2', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

let BASE = ''

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_stats',
      description: 'Dashboard stats: today count, ready outputs, running jobs',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_requirements',
      description: 'List all content requirements with status',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status (queued/running/done/failed)' },
        },
      },
    },
    {
      name: 'get_requirement',
      description: 'Get a single requirement + its output',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
    {
      name: 'create_requirement',
      description: 'Create a new content requirement for Hermes to process',
      inputSchema: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string' },
          category: { type: 'string' },
          content_type: { type: 'string', enum: ['post', 'carousel', 'reels'] },
          word_count: { type: 'number' },
          tone: { type: 'string' },
        },
      },
    },
    {
      name: 'list_outputs',
      description: 'List generated content outputs',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter: output_ready/approved/rejected' },
        },
      },
    },
    {
      name: 'get_logs',
      description: 'Recent Hermes command logs (last 20)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_brand_profile',
      description: 'Get law firm brand profile (name, tone, colors)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_app_settings',
      description: 'Get app settings (model, poll interval — NOT the API key)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'hermes_queue',
      description: 'Check Hermes job queue (what Hermes is about to process)',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (!BASE) {
    BASE = await findRunningServer() ?? ''
    if (!BASE) {
      return {
        content: [{ type: 'text', text: '❌ No running law-content-v2 server found on ports 3000–3005. Run: pnpm dev' }],
        isError: true,
      }
    }
  }

  const { name, arguments: args } = req.params
  const a = (args ?? {}) as Record<string, unknown>

  try {
    let result: unknown

    switch (name) {
      case 'get_stats':
        result = await api(BASE, '/api/local/stats')
        break

      case 'list_requirements': {
        const all = await api(BASE, '/api/local/requirements') as unknown[]
        result = a.status
          ? (all as Array<{ status?: string }>).filter(r => r.status === a.status)
          : all
        break
      }

      case 'get_requirement':
        result = await api(BASE, `/api/local/requirements/${a.id}`)
        break

      case 'create_requirement':
        result = await api(BASE, '/api/local/requirements', {
          method: 'POST',
          body: JSON.stringify(a),
        })
        break

      case 'list_outputs': {
        const reqs = await api(BASE, '/api/local/requirements') as Array<{ status?: string; output?: unknown }>
        const outputStatuses = ['output_ready', 'approved', 'rejected']
        const filtered = reqs
          .filter(r => a.status ? r.status === a.status : outputStatuses.includes(r.status ?? ''))
        result = filtered
        break
      }

      case 'get_logs':
        result = await api(BASE, '/api/local/command-logs')
        break

      case 'get_brand_profile':
        result = await api(BASE, '/api/local/brand-profile')
        break

      case 'get_app_settings': {
        const raw = await api(BASE, '/api/local/app-settings') as Record<string, unknown>
        // Never expose the API key
        const { openai_api_key: _omit, ...safe } = raw
        result = safe
        break
      }

      case 'hermes_queue':
        result = await api(BASE, '/api/local/hermes/queue')
        break

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    }
  }
})

// Discover on startup and report
const transport = new StdioServerTransport()
findRunningServer().then(url => {
  if (url) {
    BASE = url
    process.stderr.write(`[law-content-mcp] Connected to ${url}\n`)
  } else {
    process.stderr.write('[law-content-mcp] No server found — will retry on first tool call\n')
  }
})

server.connect(transport)
