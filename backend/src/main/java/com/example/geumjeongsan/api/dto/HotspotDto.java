package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.EmergencyHotspotCctv;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.WKTWriter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotspotDto {
    
    private Long cctvId;
    private String cctvCode;
    private String address;
    private String addressDescription;
    private Long incidentCount;  // 기간에 따라 다름 (30d, this_month 등)
    private Double avgSeverityScore;
    private Integer maxSeverityScore;
    private String firstIncidentAt;
    private String lastIncidentAt;
    
    // 지도 표시용
    private Double latitude;   // 위도
    private Double longitude;  // 경도
    private String geomWkt;    // WKT 형식 (필요시)
    
    /**
     * Entity -> DTO 변환 (이번 달 기준)
     */
    public static HotspotDto fromEntityThisMonth(EmergencyHotspotCctv entity) {
        return buildDto(entity, entity.getEmergencyCountThisMonth());
    }
    
    /**
     * Entity -> DTO 변환 (최근 30일 기준)
     */
    public static HotspotDto fromEntity30Days(EmergencyHotspotCctv entity) {
        return buildDto(entity, entity.getEmergencyCount30d());
    }
    
    /**
     * Entity -> DTO 변환 (최근 7일 기준)
     */
    public static HotspotDto fromEntity7Days(EmergencyHotspotCctv entity) {
        return buildDto(entity, entity.getEmergencyCount7d());
    }
    
    private static HotspotDto buildDto(EmergencyHotspotCctv entity, Long count) {
        HotspotDtoBuilder builder = HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(count != null ? count : 0L)
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore())
                .firstIncidentAt(entity.getFirstEmergencyAt() != null ? 
                    entity.getFirstEmergencyAt().toString() : null)
                .lastIncidentAt(entity.getLastEmergencyAt() != null ? 
                    entity.getLastEmergencyAt().toString() : null);
        
        // Geometry 처리 (위도/경도 추출)
        if (entity.getGeom() != null) {
            Geometry geom = entity.getGeom();
            builder.longitude(geom.getCoordinate().getX())  // 경도
                   .latitude(geom.getCoordinate().getY());   // 위도
            
            // WKT 변환 (필요시)
            try {
                WKTWriter writer = new WKTWriter();
                builder.geomWkt(writer.write(geom));
            } catch (Exception e) {
                // WKT 변환 실패 시 무시
            }
        }
        
        return builder.build();
    }
}

