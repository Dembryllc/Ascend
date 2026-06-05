import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { copyFileSync, existsSync } from 'fs'

// Copies the PDF.js worker to dist/pdf.worker.mjs with a stable, unhashed URL.
// Using ?url imports produces a content-hashed URL that can change between builds,
// causing the SPA fallback (HTML) to be served instead of the JS file, which iOS
// Safari rejects with a MIME-type error.
//
// pdfjs-dist is a nested dep of react-pdf, so we resolve it relative to
// react-pdf's own node_modules rather than the root node_modules.
function pdfWorkerPlugin() {
  return {
    name: 'pdf-worker-copy',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ?? 'dist'
      // Try root node_modules first, fall back to react-pdf's nested copy
      const candidates = [
        path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
        path.resolve(__dirname, 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs'),
      ]
      const src = candidates.find(existsSync)
      if (!src) throw new Error('pdf.worker.mjs not found in any expected location')
      copyFileSync(src, path.resolve(__dirname, outDir, 'pdf.worker.mjs'))
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    pdfWorkerPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
