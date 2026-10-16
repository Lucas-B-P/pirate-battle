import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

const rootDir = import.meta.dirname

// Serves /assets from the challenge assets folder in dev,
// and copies them into dist during build.
function gameAssetsPlugin(): Plugin {
  const assetsDir = path.resolve(rootDir, 'assets')
  const distAssetsDir = path.resolve(rootDir, 'dist/assets')

  return {
    name: 'game-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        const requestPath = (req.url ?? '/').split('?')[0]
        const filePath = path.join(assetsDir, requestPath)

        if (!filePath.startsWith(assetsDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          next()
          return
        }

        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      fs.cpSync(assetsDir, distAssetsDir, { recursive: true })
      // SPA fallback for GitHub Pages deep links
      const distDir = path.resolve(rootDir, 'dist')
      const indexHtml = path.join(distDir, 'index.html')
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, path.join(distDir, '404.html'))
      }
    },
  }
}

export default defineConfig({
  // GitHub Pages project site: BASE_PATH=/pirate-battle/ npm run build
  base: process.env.BASE_PATH || '/',
  plugins: [react(), gameAssetsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
})

