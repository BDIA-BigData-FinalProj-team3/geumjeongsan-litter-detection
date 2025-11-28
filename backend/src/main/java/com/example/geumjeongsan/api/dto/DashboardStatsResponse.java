package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    // 전체 통계
    private Long totalIncidents;
    private Long activeIncidents;
    private Long resolvedIncidents;
    
    // 유형별 통계
    private Long fireCount;
    private Long emergencyCount;
    private Long rockfallCount;
    private Long trashCount;
    
    // 상태별 통계
    private Long pendingCount;
    private Long inProgressCount;
    private Long resolvedCount;
    
    // CCTV 통계
    private Long totalCctv;
    private Long activeCctv;
    private Long inactiveCctv;
    
    // 평균 대응시간 (분)
    private Double avgResponseTime;
}

