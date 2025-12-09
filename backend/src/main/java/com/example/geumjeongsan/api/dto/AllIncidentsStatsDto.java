package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.dashboard.DailyStats;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTime;
import lombok.Getter;

/**
 * 전체현황 페이지 상단 통계 DTO
 * Frontend stats 형식에 맞춤
 */
@Getter
public class AllIncidentsStatsDto {
    private final Long todayCount;
    private final Long pendingCount;
    private final Double avgResponseTime;  // 분 단위
    private final String avgResponseTimeFormatted;  // "18분 30초"
    private final String hotspotLocation;

    public AllIncidentsStatsDto(DailyStats dailyStats, AvgResponseTime avgTime) {
        this.todayCount = dailyStats.getTodayTotal() != null ? dailyStats.getTodayTotal() : 0L;
        this.pendingCount = dailyStats.getPendingTotal() != null ? dailyStats.getPendingTotal() : 0L;
        
        // 전체 평균 처리시간
        this.avgResponseTime = avgTime.getAvgResponseMinutes() != null 
                ? avgTime.getAvgResponseMinutes() 
                : 0.0;
        
        // "18분 30초" 형식으로 변환
        this.avgResponseTimeFormatted = formatResponseTime(this.avgResponseTime);
        
        // 사고다발구간
        this.hotspotLocation = dailyStats.getHotspotLocation() != null 
                ? dailyStats.getHotspotLocation() 
                : "해당 없음";
    }

    private String formatResponseTime(Double minutes) {
        if (minutes == null || minutes == 0) {
            return "0분";
        }
        
        int totalMinutes = minutes.intValue();
        int mins = totalMinutes % 60;
        int secs = (int) ((minutes - totalMinutes) * 60);
        
        if (totalMinutes >= 60) {
            int hours = totalMinutes / 60;
            mins = totalMinutes % 60;
            if (mins > 0) {
                return hours + "시간 " + mins + "분";
            }
            return hours + "시간";
        }
        
        if (secs > 0) {
            return mins + "분 " + secs + "초";
        }
        return mins + "분";
    }
}

