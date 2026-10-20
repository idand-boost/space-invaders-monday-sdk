import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mondayDevApi } from './vite-plugins/monday-dev-api.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mondayDevApi()],
})
