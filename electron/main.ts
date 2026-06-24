import { app, BrowserWindow, Tray, Menu, dialog, nativeImage } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import http from 'http'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let tray: Tray | null = null
let nextServer: ChildProcess | null = null
let hermesWorker: ChildProcess | null = null
let hermesRestarts = 0

const APP_PORT = 3000
const APP_URL = `http://localhost:${APP_PORT}`

// Dev = running from project directory (electron-dist/main.js exists next to package.json)
// Prod = running from inside a packaged .app (process.resourcesPath points to app bundle Resources)
const PROJECT_ROOT = path.join(__dirname, '..')
const IS_DEV = fs.existsSync(path.join(PROJECT_ROOT, 'package.json')) &&
  !process.resourcesPath?.includes('.app/Contents/Resources')

// --- Paths ---
function getResourcePath(...parts: string[]): string {
  return IS_DEV
    ? path.join(PROJECT_ROOT, ...parts)
    : path.join(process.resourcesPath, ...parts)
}

function getUserDataPath(...parts: string[]): string {
  return path.join(app.getPath('userData'), ...parts)
}

// --- Next.js server ---
function spawnNextServer(): void {
  const serverScript = IS_DEV
    ? path.join(__dirname, '..', 'node_modules', '.bin', 'next')
    : path.join(getResourcePath('.next', 'standalone', 'server.js'))

  const dbPath = getUserDataPath('data', 'local.db')
  const migrationsDir = IS_DEV
    ? path.join(__dirname, '..', 'lib', 'local-db', 'migrations')
    : getResourcePath('lib', 'local-db', 'migrations')

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(APP_PORT),
    NODE_ENV: IS_DEV ? 'development' : 'production',
    LOCAL_DB_PATH: dbPath,
    MIGRATIONS_DIR: migrationsDir,
    NEXT_TELEMETRY_DISABLED: '1',
    // Required so spawning the Electron binary runs as Node.js, not a new GUI instance
    ...(IS_DEV ? {} : { ELECTRON_RUN_AS_NODE: '1' }),
  }

  if (IS_DEV) {
    nextServer = spawn(serverScript, ['dev'], { env, stdio: 'pipe' })
  } else {
    // cwd must be the standalone dir so Next.js finds .next/static and public
    const standaloneDir = path.dirname(serverScript)
    nextServer = spawn(process.execPath, [serverScript], { env, cwd: standaloneDir, stdio: 'pipe' })
  }

  const ns = nextServer
  ns.stdout?.on('data', (d: Buffer) => console.log('[next]', d.toString().trim()))
  ns.stderr?.on('data', (d: Buffer) => console.error('[next:err]', d.toString().trim()))
  ns.on('exit', (code) => console.log('[next] exited with code', code))
}

// --- Health check ---
function waitForNextReady(maxWaitMs = 30000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    function poll() {
      http.get(`${APP_URL}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve()
        setTimeout(poll, 500)
      }).on('error', () => {
        if (Date.now() - start > maxWaitMs) return reject(new Error('Next.js server did not start in time'))
        setTimeout(poll, 500)
      })
    }
    poll()
  })
}

// --- Read OpenAI key from DB ---
function getOpenAIKeyFromDb(): string {
  try {
    const dbPath = getUserDataPath('data', 'local.db')
    if (!fs.existsSync(dbPath)) return ''
    // Use require inline so it doesn't break when not in Electron context
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'openai_api_key'").get() as { value: string } | undefined
    db.close()
    return row?.value ?? ''
  } catch {
    return ''
  }
}

// --- Hermes worker ---
function spawnHermesWorker(): void {
  const hermesScript = IS_DEV
    ? path.join(__dirname, '..', 'hermes', 'worker.ts')
    : getResourcePath('dist', 'hermes.js')

  const openaiKey = getOpenAIKeyFromDb()
  const dbPath = getUserDataPath('data', 'local.db')

  const env = {
    ...process.env,
    HERMES_APP_URL: APP_URL,
    LOCAL_DB_PATH: dbPath,
    ...(openaiKey ? { OPENAI_API_KEY: openaiKey } : {}),
    // Required so spawning the Electron binary runs as Node.js, not a new GUI instance
    ...(IS_DEV ? {} : { ELECTRON_RUN_AS_NODE: '1' }),
  }

  if (IS_DEV) {
    hermesWorker = spawn('npx', ['tsx', hermesScript], { env, stdio: 'pipe' })
  } else {
    hermesWorker = spawn(process.execPath, [hermesScript], { env, stdio: 'pipe' })
  }

  hermesWorker.stdout?.on('data', (d: Buffer) => console.log('[hermes]', d.toString().trim()))
  hermesWorker.stderr?.on('data', (d: Buffer) => console.error('[hermes:err]', d.toString().trim()))

  hermesWorker.on('exit', (code) => {
    console.log('[hermes] exited with code', code)
    if (hermesRestarts < 3 && code !== 0) {
      hermesRestarts++
      console.log(`[hermes] restarting (${hermesRestarts}/3)...`)
      setTimeout(spawnHermesWorker, 2000)
    }
  })
}

// --- Splash screen ---
function createSplash(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 240,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false },
  })
  const splashPath = IS_DEV
    ? path.join(__dirname, '..', 'electron', 'splash.html')
    : getResourcePath('electron', 'splash.html')
  splashWindow.loadFile(splashPath)
}

// --- Main window ---
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // First-run: redirect to setup if API key not configured
  const openaiKey = getOpenAIKeyFromDb()
  const startUrl = openaiKey ? APP_URL : `${APP_URL}/dashboard/setup`
  mainWindow.loadURL(startUrl)

  mainWindow.once('ready-to-show', () => {
    splashWindow?.close()
    splashWindow = null
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// --- Tray ---
function createTray(): void {
  const iconPath = IS_DEV
    ? path.join(__dirname, '..', 'public', 'app-icon-tray.png')
    : getResourcePath('public', 'app-icon-tray.png')

  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('Law AI Content OS')

  const updateMenu = () => {
    const hermesRunning = hermesWorker && !hermesWorker.killed
    tray?.setContextMenu(Menu.buildFromTemplate([
      { label: 'เปิด Law AI OS', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { label: `Hermes: ${hermesRunning ? 'Running ●' : 'Stopped ○'}`, enabled: false },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit() } },
    ]))
  }

  updateMenu()
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
  setInterval(updateMenu, 5000)
}

// --- Cleanup ---
function cleanup(): void {
  nextServer?.kill()
  hermesWorker?.kill()
}

// --- App lifecycle ---
app.on('ready', async () => {
  createSplash()
  spawnNextServer()
  spawnHermesWorker()

  try {
    await waitForNextReady()
  } catch {
    dialog.showErrorBox(
      'Startup Failed',
      'ไม่สามารถเริ่มต้น Next.js server ได้ใน 30 วินาที\nลองรีสตาร์ท app ใหม่'
    )
    app.quit()
    return
  }

  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  // On Mac: keep running in tray instead of quitting
  if (process.platform !== 'darwin' || !tray) app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
  else { mainWindow.show(); mainWindow.focus() }
})

app.on('before-quit', cleanup)
