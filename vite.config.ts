import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps the build portable (GitHub Pages sub-paths, Cloudflare, any static host)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
})
