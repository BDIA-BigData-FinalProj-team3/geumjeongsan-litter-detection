package com.example.geumjeongsan.domain.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 일일 통계 DTO
 * VIEW: view_all_incidents_daily_stats
 * 용도: 전체현황 상단 KPI 카드 (당일 발생, 대기중, 사고다발구간)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DailyStats {
    private Long todayTotal;
    private Long todayEmergency;
    private Long todayFire;
    private Long todayTrash;
    private Long pendingTotal;
    private String hotspotLocation;
    private Long hotspotCount;
}

