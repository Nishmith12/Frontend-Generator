import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // With Tailwind v3, the CSS configuration is now handled automatically
  // by the postcss.config.js file, so we don't need it here.
})

