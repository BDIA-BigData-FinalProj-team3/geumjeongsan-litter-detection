package com.example.geumjeongsan.api.dto;

/**
 * CCTV 운영 통계
 * VIEW: view_report_daily_cctv_uptime
 */
public record CctvStats(
    int total,         // 전체 샘플 수
    int operational,   // 정상 (ON)
    int maintenance    // 정비 (OFF)
) {}

