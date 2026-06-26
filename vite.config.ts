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
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'vendor-react'
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase'
          if (id.includes('/react-pdf/') || id.includes('/pdfjs-dist/')) return 'vendor-pdf'
          if (id.includes('/jspdf/')) return 'vendor-jspdf'
          if (id.includes('/html2canvas/')) return 'vendor-html2canvas'
          if (id.includes('/dompurify/')) return 'vendor-dompurify'
          if (id.includes('/lucide-react/')) return 'vendor-icons'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
