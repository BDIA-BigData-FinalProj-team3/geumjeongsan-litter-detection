package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사고 다발구간 DTO (복잡한 형식 - 기존)
 * CCTV 상세 정보 포함
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotspotDto {
    private Long cctvId;
    private String cctvCode;
    private String address;
    private String addressDescription;
    private Long incidentCount;
    private Double avgSeverityScore;
    private Double maxSeverityScore;
    private String firstIncidentAt;
    private String lastIncidentAt;
    private Double latitude;
    private Double longitude;
    private String geomWkt;
}
