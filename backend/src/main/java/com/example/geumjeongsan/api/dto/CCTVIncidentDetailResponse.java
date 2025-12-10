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
public class CCTVIncidentDetailResponse {
    private Long id;
    private String cctvId;
    private String location;
    private List<IncidentDetail> incidents;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncidentDetail {
        private Long id;
        private String incidentType;  // FIRE, ROCKFALL, TRASH, EMERGENCY
        private String incidentCode;  // 사건 코드 (예: E-CCTV-091-1) - VIEW 컬럼 그대로
        private String detectedAt;    // 발생시간 (포맷된 문자열)
        private String detectionModel; // 모델명
        private Double detectionConfidence; // 신뢰도
        private String severity;      // high, medium, low
        private String status;        // PENDING, IN_PROGRESS, RESOLVED
        private String sourceType;    // AUTO / MANUAL
        private String locationDesc;  // 발생 위치 설명
    }
}

