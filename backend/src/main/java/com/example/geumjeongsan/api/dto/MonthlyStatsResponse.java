package com.example.geumjeongsan.api.dto;

/**
 * 월간 통계 응답 (프론트 기대 형식)
 * VIEW: view_report_daily_incident_type + view_report_daily_cctv_uptime + view_report_daily_response_time
 */
public record MonthlyStatsResponse(
    IncidentTypeStats fire,
    IncidentTypeStats trash,
    IncidentTypeStats emergency,
    IncidentTypeStats rockfall,
    CctvStats cctv,
    AiDetectionStats aiDetection
) {}

