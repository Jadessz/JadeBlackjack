import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to GitHub Pages at https://jadessz.github.io/JadeBlackjack/, so the
// production build must be served from that subpath. Dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/JadeBlackjack/' : '/',
  plugins: [react()],
}))
