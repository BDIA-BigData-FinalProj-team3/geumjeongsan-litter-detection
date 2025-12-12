package com.example.geumjeongsan.api.dto;

import java.util.List;

/**
 * 통계 페이지용 전체 요약 데이터
 * VIEW: view_stats_daily_incident_type
 */
public record StatsOverviewDto(
        List<IncidentTrendPointDto> trend,
        List<IncidentTypeSummaryDto> typeSummary,
        CompletionSummaryDto completionSummary
) {}

