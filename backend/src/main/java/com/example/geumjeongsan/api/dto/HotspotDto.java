package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.EmergencyHotspotCctv;
import com.example.geumjeongsan.domain.incident.FireHotspotCctv;
import com.example.geumjeongsan.domain.incident.TrashHotspotCctv;
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
    
    /**
     * 응급 Hotspot Entity에서 변환 (this_month)
     */
    public static HotspotDto fromEntityThisMonth(EmergencyHotspotCctv entity) {
        return HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(entity.getEmergencyCountThisMonth())
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore() != null ? entity.getMaxSeverityScore().doubleValue() : null)
                .firstIncidentAt(entity.getFirstEmergencyAt() != null ? entity.getFirstEmergencyAt().toString() : null)
                .lastIncidentAt(entity.getLastEmergencyAt() != null ? entity.getLastEmergencyAt().toString() : null)
                .latitude(null) // EmergencyHotspotCctv에는 latitude 없음
                .longitude(null)
                .geomWkt(entity.getGeom() != null ? entity.getGeom().toText() : null)
                .build();
    }
    
    /**
     * 응급 Hotspot Entity에서 변환 (30 days)
     */
    public static HotspotDto fromEntity30Days(EmergencyHotspotCctv entity) {
        return HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(entity.getEmergencyCount30d())
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore() != null ? entity.getMaxSeverityScore().doubleValue() : null)
                .firstIncidentAt(entity.getFirstEmergencyAt() != null ? entity.getFirstEmergencyAt().toString() : null)
                .lastIncidentAt(entity.getLastEmergencyAt() != null ? entity.getLastEmergencyAt().toString() : null)
                .latitude(null)
                .longitude(null)
                .geomWkt(entity.getGeom() != null ? entity.getGeom().toText() : null)
                .build();
    }
    
    /**
     * 응급 Hotspot Entity에서 변환 (7 days)
     */
    public static HotspotDto fromEntity7Days(EmergencyHotspotCctv entity) {
        return HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(entity.getEmergencyCount7d())
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore() != null ? entity.getMaxSeverityScore().doubleValue() : null)
                .firstIncidentAt(entity.getFirstEmergencyAt() != null ? entity.getFirstEmergencyAt().toString() : null)
                .lastIncidentAt(entity.getLastEmergencyAt() != null ? entity.getLastEmergencyAt().toString() : null)
                .latitude(null)
                .longitude(null)
                .geomWkt(entity.getGeom() != null ? entity.getGeom().toText() : null)
                .build();
    }
}
