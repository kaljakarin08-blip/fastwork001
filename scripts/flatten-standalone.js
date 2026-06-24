// Resolves pnpm symlinks in .next/standalone/node_modules/ to real directories
// so electron-builder can copy them correctly into the app bundle.
const fs = require('fs')
const path = require('path')

const standaloneModules = path.join(process.cwd(), '.next', 'standalone', 'node_modules')

if (!fs.existsSync(standaloneModules)) {
  console.log('No standalone node_modules found, skipping')
  process.exit(0)
}

const entries = fs.readdirSync(standaloneModules, { withFileTypes: true })
let count = 0

for (const entry of entries) {
  if (entry.name === '.pnpm') continue

  const linkPath = path.join(standaloneModules, entry.name)
  if (entry.isSymbolicLink()) {
    const target = fs.readlinkSync(linkPath)
    const realTarget = path.resolve(standaloneModules, target)
    if (fs.existsSync(realTarget)) {
      fs.rmSync(linkPath, { recursive: true, force: true })
      fs.cpSync(realTarget, linkPath, { recursive: true })
      console.log(`  flattened: ${entry.name}`)
      count++
    }
  }
}

// Remove .pnpm after flattening — no longer needed
const pnpmDir = path.join(standaloneModules, '.pnpm')
if (fs.existsSync(pnpmDir)) {
  fs.rmSync(pnpmDir, { recursive: true, force: true })
  console.log('  removed .pnpm/')
}

console.log(`Done — ${count} packages flattened`)
