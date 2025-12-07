/// <reference types="vite/client" />

// API Base URL Configuration
// 로컬 개발: .env 없으면 기본값 localhost:8080
// 배포 환경: .env.production에 실제 백엔드 URL 설정
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:8080';

export default API_BASE_URL;

