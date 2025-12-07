package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyStatsDto {
    
    /**
     * 당일 발생건수
     */
    private Long todayCount;
    
    /**
     * 대기중 건수
     */
    private Long pendingCount;
    
    /**
     * 월평균 처리시간 (분)
     */
    private Double avgResponseTime;
    
    /**
     * 포맷된 월평균 처리시간 (예: "5분 30초")
     */
    private String avgResponseTimeFormatted;
}

