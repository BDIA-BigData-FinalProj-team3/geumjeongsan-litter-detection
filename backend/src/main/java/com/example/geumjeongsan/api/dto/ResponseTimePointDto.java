package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * 평균 대응시간 데이터 포인트 (VIEW 한 줄 그대로)
 * VIEW: view_stats_daily_response_time
 */
public record ResponseTimePointDto(
        LocalDate period,      // 연/월/일 단위 날짜
        String incidentType,   // 'EMERGENCY' | 'FIRE' | 'TRASH' | ...
        double avgSecToResolve // 평균 해결시간(초)
) {}

