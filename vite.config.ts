import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Function form: the object form of manualChunks is deprecated and
        // is dropped from newer Rollup type definitions.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/')) return 'firebase'
          if (id.includes('/leaflet/') || id.includes('/react-leaflet/')) return 'leaflet'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/zustand/') ||
            id.includes('/motion/')
          )
            return 'vendor'
        },
      },
    },
  },
})
