package com.example.geumjeongsan.domain.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 월평균 처리시간 DTO
 * VIEW: view_all_incidents_avg_response_time
 * 용도: 전체현황 상단 KPI 카드 (월평균 처리시간)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AvgResponseTime {
    private Double avgResponseMinutes;
    private Double emergencyAvg;
    private Double fireAvg;
    private Double trashAvg;
}

