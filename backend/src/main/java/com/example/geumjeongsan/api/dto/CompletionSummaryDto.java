package com.example.geumjeongsan.api.dto;

/**
 * 처리 완료 비율 요약
 * VIEW: view_stats_daily_incident_type
 */
public record CompletionSummaryDto(
        long resolved,
        long unresolved
) {}

