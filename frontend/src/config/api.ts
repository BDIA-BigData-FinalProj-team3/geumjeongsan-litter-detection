/// <reference types="vite/client" />

// API Base URL Configuration
// 배포 환경: 환경 변수가 설정되면 그 값 사용 (빈 문자열이면 상대 경로)
// 로컬 개발: 환경 변수 없으면 localhost:8080 사용
const API_BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:8080' : '');  // 개발 모드일 때만 localhost 사용

// Ingest HLS URL Configuration
// 배포 환경: Github Actions에서 VITE_INGEST_HLS_URL 주입
export const INGEST_HLS_URL = 
  (import.meta.env.VITE_INGEST_HLS_URL as string | undefined) ||
  'http://54.180.203.184:8080/hls';

export default API_BASE_URL;

