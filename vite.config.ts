import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages altında https://wanheda4587.github.io/deneme/ adresinde yayınlanır.
export default defineConfig({
  base: '/deneme/',
  plugins: [react(), tailwindcss()],
})
