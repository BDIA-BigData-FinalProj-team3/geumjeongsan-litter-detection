/// <reference types="vite/client" />

// API Base URL Configuration
// 로컬 개발: .env 없으면 기본값 localhost:8080
// 배포 환경: Github Actions에서 VITE_BACKEND_URL 주입
const API_BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:8080';

export default API_BASE_URL;

