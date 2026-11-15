import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Spring Boot(yeoback_backend) 포트
const BACKEND = 'http://localhost:10000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중에는 React(5173)에서 보낸 API 요청을 Spring Boot로 넘긴다 → CORS 설정 없이 호출 가능
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
    },
  },
})
