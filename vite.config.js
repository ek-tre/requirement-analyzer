import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : process.env.NODE_ENV === 'development' ? '/requirement-analyzer/' : '/discovery_and_design_planning/',
})
