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
      // 소셜 로그인 시작 주소. changeOrigin 덕분에 Spring 이 공급자 콜백 주소를
      // http://localhost:10000/login/oauth2/code/{provider} 로 만든다 (공급자 콘솔에 등록된 주소와 같아야 함)
      '/oauth2': { target: BACKEND, changeOrigin: true },
    },
  },
})
