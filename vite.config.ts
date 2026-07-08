import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy de desenvolvimento: encaminha /backend -> API de produção, evitando o
  // bloqueio de CORS quando o dev server (localhost) chama a API cross-origin.
  // Só afeta `vite dev`; o build de produção usa a URL absoluta (ver config.ts).
  server: {
    proxy: {
      '/backend': {
        target: 'https://hoteleirorp.gestao.afsys.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
})
