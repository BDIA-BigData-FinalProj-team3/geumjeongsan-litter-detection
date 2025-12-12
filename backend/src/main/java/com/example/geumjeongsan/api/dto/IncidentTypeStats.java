package com.example.geumjeongsan.api.dto;

/**
 * 유형별 사고 통계 (화재/쓰레기/응급/낙석)
 * VIEW: view_report_daily_incident_type + view_report_daily_response_time
 */
public record IncidentTypeStats(
    int total,           // 총 발생
    int resolved,        // 처리완료
    int pending,         // 대기중
    String avgResponseTime  // 평균 대응시간 (예: "4.2분")
) {}

