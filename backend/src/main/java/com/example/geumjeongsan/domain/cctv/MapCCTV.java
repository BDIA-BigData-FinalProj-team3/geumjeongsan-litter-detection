package com.example.geumjeongsan.domain.cctv;

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

@Entity
@Getter
@Immutable // View는 읽기 전용
@Table(name = "view_map_cctv") // DB View 이름과 정확히 일치해야 함
public class MapCCTV {

    @Id
    @Column(name = "cctv_id")
    private Long cctvId;

    @Column(name = "cctv_code")
    private String cctvCode;

    @Column(name = "cctv_address")
    private String cctvAddress;

    @Column(name = "name")
    private String name;

    @Column(name = "location_desc")
    private String locationDesc;

    @Column(name = "install_date")
    private java.time.LocalDate installDate;

    @Column(name = "resolution")
    private String resolution;

    @Column(name = "is_active")
    private Boolean isActive;

    @JsonIgnore // 원본 Point 객체는 JSON 직렬화 제외
    @Column(name = "geom", columnDefinition = "geometry(Point,4326)")
    private Point geom;

    @JsonProperty("geom") // 대신 이 메서드의 반환값을 "geom"이라는 이름으로 내보냄
    public GeomDto getGeomDto() {
        if (this.geom != null) {
            return new GeomDto(this.geom.getX(), this.geom.getY());
        }
        return null;
    }

    // 간단한 내부 클래스 DTO
    public static class GeomDto {
        public double x;
        public double y;

        public GeomDto(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }

    @Column(name = "model_name")
    private String modelName;

    @Column(name = "power_status")
    private String powerStatus;

    @Column(name = "health_status")
    private String healthStatus;

    @Column(name = "last_incident_at")
    private OffsetDateTime lastIncidentAt;

    @Column(name = "last_incident_type")
    private String lastIncidentType;

    @Column(name = "incident_count")
    private Long incidentCount;
}

