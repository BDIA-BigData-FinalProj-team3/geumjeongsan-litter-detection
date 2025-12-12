package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * 사고 건수 추이 그래프용 데이터 포인트
 * VIEW: view_stats_daily_incident_type
 */
public record IncidentTrendPointDto(
        LocalDate period, // 연/월/일 기준 날짜
        long total,       // 전체
        long trash,       // 쓰레기
        long fire,        // 화재
        long emergency    // 응급
) {}

