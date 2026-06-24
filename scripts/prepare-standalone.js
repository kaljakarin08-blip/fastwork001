// Next.js standalone does not copy .next/static/ automatically.
// This script copies it so the packaged app can serve JS/CSS bundles.
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const src = path.join(root, '.next', 'static')
const dest = path.join(root, '.next', 'standalone', '.next', 'static')

if (!fs.existsSync(src)) {
  console.error('[prepare-standalone] .next/static not found — run next build first')
  process.exit(1)
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
fs.cpSync(src, dest, { recursive: true })
console.log(`[prepare-standalone] Copied .next/static → standalone/.next/static`)
