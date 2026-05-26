import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { copyFileSync } from 'fs'

// Copies the PDF.js worker to dist/pdf.worker.mjs with a stable, unhashed URL.
// Using ?url imports produces a content-hashed URL that can differ between local
// and CI/Netlify builds, causing the SPA fallback (HTML) to be served instead of
// the JS file, which iOS Safari rejects with a MIME-type error.
function pdfWorkerPlugin() {
  return {
    name: 'pdf-worker-copy',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ?? 'dist'
      copyFileSync(
        path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
        path.resolve(__dirname, outDir, 'pdf.worker.mjs'),
      )
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
