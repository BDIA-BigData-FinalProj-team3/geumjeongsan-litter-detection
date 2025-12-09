package com.example.geumjeongsan.domain.mainmap;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Point;

/**
 * MainMap - 전체탐지 마커용 VIEW
 * 
 * VIEW: view_mainmap_incident_markers
 * 용도: 전체탐지 탭에서 지도에 표시할 CCTV 마커 정보
 * 
 * 특징:
 * - CCTV별로 미처리 사건을 집계
 * - 우선순위(FIRE > EMERGENCY > TRASH) 계산됨
 * - NEW 여부(최근 5분) 계산됨
 */
@Entity
@Getter
@Immutable  // VIEW는 읽기 전용
@Table(name = "view_mainmap_incident_markers")
public class MainMapIncidentMarker {
    
    @Id
    @Column(name = "cctv_id")
    private Long cctvId;
    
    @Column(name = "cctv_code")
    private String cctvCode;
    
    @Column(name = "cctv_address")
    private String cctvAddress;
    
    // PostGIS Point → JSON 변환
    @JsonIgnore
    @Column(name = "geom", columnDefinition = "geometry(Point,4326)")
    private Point geom;
    
    @JsonProperty("geom")
    public GeomDto getGeomDto() {
        if (this.geom != null) {
            return new GeomDto(this.geom.getX(), this.geom.getY());
        }
        return null;
    }
    
    // 간단한 내부 클래스 DTO (좌표 전달용)
    public static class GeomDto {
        public double x;  // longitude
        public double y;  // latitude
        
        public GeomDto(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }
    
    // 미처리 사건 총 개수
    @Column(name = "unresolved_count")
    private Long unresolvedCount;
    
    // 유형별 사건 개수
    @Column(name = "fire_count")
    private Long fireCount;
    
    @Column(name = "emergency_count")
    private Long emergencyCount;
    
    @Column(name = "trash_count")
    private Long trashCount;
    
    // 대표 사건 유형 (우선순위: FIRE > EMERGENCY > TRASH)
    @Column(name = "top_incident_type")
    private String topIncidentType;  // "FIRE", "EMERGENCY", "TRASH", null
    
    // 새 사건 여부 (최근 5분 이내)
    @Column(name = "has_new")
    private Boolean hasNew;
}

