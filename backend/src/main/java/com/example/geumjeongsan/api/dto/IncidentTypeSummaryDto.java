package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * 사고 유형별 요약 통계
 * VIEW: view_stats_daily_incident_type
 */
public record IncidentTypeSummaryDto(
        LocalDate period, // 기간 (연/월/일 기준 날짜)
        String incidentType, // 'EMERGENCY' | 'FIRE' | 'TRASH' | 'ETC'
        long totalIncidents,
        long autoIncidents,
        long resolvedIncidents,
        long unresolvedIncidents
) {}

