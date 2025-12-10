package com.example.geumjeongsan.domain.mainmap;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;

/**
 * 위험지도 히트맵용 VIEW Entity
 * 
 * VIEW: view_risk_map_heatmap
 * 용도: 위험지도 탭에서 등산로 구간별/CCTV별 사건 통계
 * 
 * 특징:
 * - 등산로 구간별 사건 통계 (TRAIL_SEGMENT)
 * - CCTV별 사고다발 구간 통계 (CCTV)
 * - 전체 사건 기준 (해결/미해결 포함)
 */
@Entity
@Getter
@Immutable  // VIEW는 읽기 전용
@Table(name = "view_risk_map_heatmap")
public class RiskMapHeatmap {
    
    @Id
    @Column(name = "entity_id")
    private Long entityId;
    
    @Column(name = "entity_type")
    private String entityType;  // "TRAIL_SEGMENT" 또는 "CCTV"
    
    @Column(name = "entity_name")
    private String entityName;  // segment_name 또는 cctv_code
    
    @Column(name = "trail_name")
    private String trailName;  // trail_name_kor (등산로만)
    
    @Column(name = "cctv_code")
    private String cctvCode;  // cctv_code (CCTV만)
    
    @Column(name = "cctv_address")
    private String cctvAddress;  // cctv_address (CCTV만)
    
    // Geometry (Point 또는 LineString)
    @JsonIgnore
    @Column(name = "geom", columnDefinition = "geometry")
    private Geometry geom;
    
    @JsonProperty("geom")
    public GeomDto getGeomDto() {
        if (this.geom == null) {
            return null;
        }
        
        // Point인 경우
        if (this.geom instanceof Point) {
            Point point = (Point) this.geom;
            return new GeomDto("Point", new double[][]{{point.getX(), point.getY()}});
        }
        
        // LineString인 경우
        if (this.geom instanceof LineString) {
            LineString lineString = (LineString) this.geom;
            org.locationtech.jts.geom.Coordinate[] coords = lineString.getCoordinates();
            double[][] coordinates = new double[coords.length][2];
            for (int i = 0; i < coords.length; i++) {
                coordinates[i][0] = coords[i].x;  // longitude
                coordinates[i][1] = coords[i].y;  // latitude
            }
            return new GeomDto("LineString", coordinates);
        }
        
        return null;
    }
    
    // Geometry DTO (좌표 전달용)
    public static class GeomDto {
        public String type;  // "Point" 또는 "LineString"
        public double[][] coordinates;  // Point: [[lng, lat]], LineString: [[lng, lat], [lng, lat], ...]
        
        public GeomDto(String type, double[][] coordinates) {
            this.type = type;
            this.coordinates = coordinates;
        }
    }
    
    // 사건 개수
    @Column(name = "fire_count")
    private Long fireCount;
    
    @Column(name = "emergency_count")
    private Long emergencyCount;
    
    @Column(name = "trash_count")
    private Long trashCount;
    
    @Column(name = "total_count")
    private Long totalCount;
}

