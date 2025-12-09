package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class CCTVResponse {
    private Long id;
    private String cctvCode;  // CCTV-001
    private String name;
    private String locationDesc;
    private String installDate;
    private String modelName;
    private String resolution;
    private Boolean isActive;
    private String powerStatus;  // on/off
    private Double longitude;  // geom에서 추출
    private Double latitude;   // geom에서 추출
    private Long incidentCount;  // 최근 사건 수 (선택적)
    private String lastIncidentTime;  // 최근 감지시간 (예: "2025-11-27 14:30:00")
    private String lastIncidentType;  // 최근 감지 유형 (FIRE, ROCKFALL, TRASH, EMERGENCY)
}

