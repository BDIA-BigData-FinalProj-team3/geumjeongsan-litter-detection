package com.example.geumjeongsan.domain.dashboard;

/**
 * 상단 KPI용 CCTV 집계 값
 * - totalActive: 활성 CCTV 총 대수
 * - onActive: 활성 CCTV 중 현재 ON 대수
 */
public record CctvKpi(long totalActive, long onActive) {}


