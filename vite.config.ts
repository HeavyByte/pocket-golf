import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 49', 'firefox >= 45', 'safari >= 10', 'edge >= 15'],
    }),
  ],
  base: '/golf/',
})
