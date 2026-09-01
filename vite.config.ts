import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy de desenvolvimento: encaminha /backend -> API do DEFAULT_TENANT,
  // evitando o bloqueio de CORS quando o dev server (localhost) chama a API
  // cross-origin. Só afeta `vite dev`; em produção cada tenant usa a própria
  // URL absoluta (config/tenants.ts -> apiBase). Para testar outro sindicato em
  // dev, troque o target abaixo.
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
