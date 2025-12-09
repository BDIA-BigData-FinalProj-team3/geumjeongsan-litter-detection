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

import java.time.OffsetDateTime;

/**
 * MainMap - 실시간 CCTV 상태용 VIEW
 * 
 * VIEW: view_mainmap_cctv_status
 * 용도: 실시간 CCTV 탭에서 지도에 표시할 CCTV 상태 정보
 * 
 * 특징:
 * - CCTV 전원/헬스 상태
 * - display_status (OFF > NEED_CHECK > ON 우선순위)
 * - 최근 사건 정보 포함
 */
@Entity
@Getter
@Immutable  // VIEW는 읽기 전용
@Table(name = "view_mainmap_cctv_status")
public class MainMapCCTVStatus {
    
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
    
    // 전원 상태
    @Column(name = "power_status")
    private String powerStatus;  // ON / OFF
    
    // 헬스 상태
    @Column(name = "health_status")
    private String healthStatus;  // NORMAL / NEED_CHECK / OFFLINE
    
    // 마지막 헬스체크 시간
    @Column(name = "last_heartbeat")
    private OffsetDateTime lastHeartbeat;
    
    // 최근 사건 정보
    @Column(name = "last_incident_id")
    private Long lastIncidentId;
    
    @Column(name = "last_incident_type")
    private String lastIncidentType;  // FIRE / EMERGENCY / TRASH
    
    @Column(name = "last_incident_at")
    private OffsetDateTime lastIncidentAt;
    
    // 표시 상태 (우선순위 계산됨: OFF > NEED_CHECK > ON)
    @Column(name = "display_status")
    private String displayStatus;  // OFF / NEED_CHECK / ON
}

