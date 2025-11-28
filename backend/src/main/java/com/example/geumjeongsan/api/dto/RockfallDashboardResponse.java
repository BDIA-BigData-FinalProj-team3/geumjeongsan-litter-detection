package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RockfallDashboardResponse {
    // 현황
    private Long todayCount;           // 당일 발생 건수
    private Long pendingCount;         // 처리 대기중 건수
    private Double avgResponseTime;    // 평균 대응시간 (분)
    private List<String> riskAreas;    // 위험지역 위치
    
    // 목록
    private List<RockfallIncidentItem> activeIncidents;    // 발생
    private List<RockfallIncidentItem> resolvedIncidents;  // 처리완료
}

