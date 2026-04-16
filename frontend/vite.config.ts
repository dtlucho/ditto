import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/__ditto__/',
  server: {
    proxy: {
      '/__ditto__/api': 'http://localhost:8888',
      '/__ditto__/events': {
        target: 'http://localhost:8888',
        ws: true,
      },
    },
  },
})
