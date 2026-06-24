/**
 * MCP Daemon — HTTP multi-client server
 *
 * Usage:  pnpm mcp:daemon
 * Config: .mcp.json → { "url": "http://localhost:3099/mcp" }
 *
 * On startup: scans ports 3000-3005 for running runtime.
 * If not found: auto-spawns `pnpm dev` and waits until ready.
 * Multiple Claude Code / Codex sessions can connect simultaneously.
 */

import http from 'node:http'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const DAEMON_PORT = 3099
const APP_DIR = process.cwd()
const SCAN_PORTS = [3000, 3001, 3002, 3003, 3004, 3005]

let BASE = ''
let appProcess: ChildProcess | null = null

// --- Runtime management ---

async function scanRuntime(): Promise<string | null> {
  for (const port of SCAN_PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(600),
      })
      if (res.ok) {
        const j = (await res.json()) as { ok?: boolean }
        if (j.ok) return `http://localhost:${port}`
      }
    } catch { /* try next */ }
  }
  return null
}

async function ensureRuntime(): Promise<string> {
  const found = await scanRuntime()
  if (found) return found

  log('No runtime found — spawning pnpm dev...')
  appProcess = spawn('pnpm', ['dev'], {
    cwd: APP_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })
  appProcess.stdout?.on('data', (d: Buffer) => process.stdout.write(`[dev] ${d}`))
  appProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(`[dev] ${d}`))
  appProcess.on('exit', (code) => {
    log(`pnpm dev exited (code ${code})`)
    appProcess = null
    BASE = ''
  })

  // Poll up to 45s
  for (let i = 0; i < 90; i++) {
    await new Promise<void>(r => setTimeout(r, 500))
    const url = await scanRuntime()
    if (url) { log(`Runtime ready at ${url}`); return url }
  }
  throw new Error('Runtime did not start within 45s')
}

// --- Tool API helpers ---

async function api(endpoint: string, opts?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// --- MCP server factory (one per HTTP session) ---

function createServer(): Server {
  const server = new Server(
    { name: 'law-content-v2', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_stats',
        description: 'Dashboard stats: today count, ready outputs, running jobs',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_requirements',
        description: 'List content requirements (optional: filter by status)',
        inputSchema: {
          type: 'object',
          properties: { status: { type: 'string', description: 'queued | running | done | failed' } },
        },
      },
      {
        name: 'get_requirement',
        description: 'Get one requirement + its generated output',
        inputSchema: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
      {
        name: 'create_requirement',
        description: 'Queue a new content requirement for Hermes to process',
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
        description: 'List generated outputs (output_ready / approved / rejected)',
        inputSchema: {
          type: 'object',
          properties: { status: { type: 'string' } },
        },
      },
      {
        name: 'get_logs',
        description: 'Recent Hermes command logs (last 20)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_brand_profile',
        description: 'Law firm brand profile (name, tone, colors)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_app_settings',
        description: 'App settings — model, poll interval (API key is stripped)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'hermes_queue',
        description: 'Current Hermes job queue',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    const a = (args ?? {}) as Record<string, unknown>

    try {
      let result: unknown

      switch (name) {
        case 'get_stats':
          result = await api('/api/local/stats')
          break

        case 'list_requirements': {
          const all = (await api('/api/local/requirements')) as Array<{ status?: string }>
          result = a.status ? all.filter(r => r.status === a.status) : all
          break
        }

        case 'get_requirement':
          result = await api(`/api/local/requirements/${a.id}`)
          break

        case 'create_requirement':
          result = await api('/api/local/requirements', {
            method: 'POST',
            body: JSON.stringify(a),
          })
          break

        case 'list_outputs': {
          const reqs = (await api('/api/local/requirements')) as Array<{ status?: string }>
          const outputStatuses = ['output_ready', 'approved', 'rejected']
          result = reqs.filter(r =>
            a.status ? r.status === a.status : outputStatuses.includes(r.status ?? '')
          )
          break
        }

        case 'get_logs':
          result = await api('/api/local/command-logs')
          break

        case 'get_brand_profile':
          result = await api('/api/local/brand-profile')
          break

        case 'get_app_settings': {
          const raw = (await api('/api/local/app-settings')) as Record<string, unknown>
          const { openai_api_key: _omit, ...safe } = raw
          result = safe
          break
        }

        case 'hermes_queue':
          result = await api('/api/local/hermes/queue')
          break

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          }
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  })

  return server
}

// --- HTTP server ---

function log(msg: string) {
  process.stdout.write(`[daemon] ${msg}\n`)
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url !== '/mcp') {
    res.writeHead(req.url === '/' ? 200 : 404, { 'Content-Type': 'text/plain' })
    res.end(req.url === '/' ? `law-content-v2 MCP daemon — runtime: ${BASE || 'pending'}` : 'Not found')
    return
  }

  // Ensure runtime before serving tools
  if (!BASE) {
    try { BASE = await ensureRuntime() } catch (e) {
      res.writeHead(503, { 'Content-Type': 'text/plain' })
      res.end(`Runtime unavailable: ${e instanceof Error ? e.message : e}`)
      return
    }
  }

  // Stateless: each request gets its own server+transport instance
  // (our tools are pure request→response, no session state needed)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  })
  const server = createServer()
  await server.connect(transport)

  try {
    await transport.handleRequest(req, res)
  } finally {
    await server.close()
  }
})

// Startup: try to connect to runtime right away (don't block if not running)
ensureRuntime()
  .then(url => { BASE = url })
  .catch(err => log(`Runtime init: ${err.message} — will retry on first request`))

httpServer.listen(DAEMON_PORT, () => {
  log(`Listening on http://localhost:${DAEMON_PORT}/mcp`)
  log(`Connect via .mcp.json: { "url": "http://localhost:${DAEMON_PORT}/mcp" }`)
})

// Cleanup
function shutdown() {
  log('Shutting down...')
  appProcess?.kill()
  httpServer.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
