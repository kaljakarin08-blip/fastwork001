const fs = require('fs')
const path = require('path')

exports.default = async function (context) {
  const { appOutDir, packager } = context
  const productName = packager.appInfo.productFilename

  const resourcesPath = process.platform === 'darwin'
    ? path.join(appOutDir, `${productName}.app`, 'Contents', 'Resources')
    : path.join(appOutDir, 'resources')

  const srcModules = path.join(process.cwd(), '.next', 'standalone', 'node_modules')
  const destModules = path.join(resourcesPath, '.next', 'standalone', 'node_modules')

  if (!fs.existsSync(srcModules)) {
    console.log('[afterPack] No standalone node_modules to copy')
    return
  }

  if (fs.existsSync(destModules)) {
    fs.rmSync(destModules, { recursive: true, force: true })
  }

  console.log(`[afterPack] Copying node_modules (dereference) → ${destModules}`)
  // dereference: true resolves all pnpm symlinks to real files
  fs.cpSync(srcModules, destModules, { recursive: true, dereference: true })

  // Replace better-sqlite3.node in standalone with the arch-correct one
  // that electron-builder already rebuilt via npmRebuild: true
  const rebuiltNode = path.join(
    resourcesPath, 'app.asar.unpacked', 'node_modules',
    'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'
  )

  if (fs.existsSync(rebuiltNode)) {
    const standaloneNodes = []
    // Find all better_sqlite3.node files in standalone
    function findNodes(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) findNodes(full)
        else if (entry.name === 'better_sqlite3.node') standaloneNodes.push(full)
      }
    }
    findNodes(destModules)

    for (const nodePath of standaloneNodes) {
      fs.copyFileSync(rebuiltNode, nodePath)
      console.log(`[afterPack] Fixed arch: ${path.relative(resourcesPath, nodePath)}`)
    }
  }

  console.log('[afterPack] Done')
}
