package com.example.geumjeongsan.api.dto;

/**
 * AI 탐지 vs 신고 통계
 * VIEW: view_report_daily_incident_type (source_type 집계)
 */
public record AiDetectionStats(
    int aiTotal,      // AUTO (AI 탐지) 총수
    int manualTotal   // MANUAL (신고) 총수
) {}

