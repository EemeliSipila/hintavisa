import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // suhteelliset polut: toimii sekä GitHub Pagesin /hintavisa/-polussa että Firebase Hostingin juuressa
})
