/// <reference types="vite/client" />

// API Base URL Configuration
// - 배포(Prod): 기본은 **상대경로**로 호출해서 same-origin으로 CORS를 피한다. (예: https://geumjeongsan-admin.org/api/...)
// - 로컬(Dev): 기본은 localhost:8080
// - 필요 시 VITE_BACKEND_URL / VITE_API_BASE_URL로 강제 지정 가능
const envBase =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined);

const API_BASE_URL =
  (typeof envBase === 'string' ? envBase : undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8080' : '');

// Ingest HLS URL Configuration
// 배포 환경: Github Actions에서 VITE_INGEST_HLS_URL 주입
export const INGEST_HLS_URL = 
  (import.meta.env.VITE_INGEST_HLS_URL as string | undefined) ||
  'http://54.180.203.184:8080/hls';

export default API_BASE_URL;

// Trigger workflow for VITE_BACKEND_URL fix
