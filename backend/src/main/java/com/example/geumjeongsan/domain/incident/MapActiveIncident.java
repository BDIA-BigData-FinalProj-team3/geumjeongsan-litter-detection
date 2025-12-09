package com.example.geumjeongsan.domain.incident;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Point;
import java.time.OffsetDateTime;

@Entity
@Getter
@Immutable // View는 읽기 전용
@Table(name = "view_map_active_incidents")
public class MapActiveIncident {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "cctv_id")
    private Long cctvId;

    @Column(name = "incident_type")
    private String incidentType; // FIRE / EMERGENCY / TRASH

    @Column(name = "severity_level")
    private String severityLevel; // HIGH / MEDIUM / LOW

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @Column(name = "current_status")
    private String currentStatus;

    @Column(name = "location_desc")
    private String locationDesc;

    @JsonIgnore
    @Column(name = "cctv_geom", columnDefinition = "geometry(Point,4326)")
    private Point cctvGeom;

    @JsonProperty("cctvGeom")
    public GeomDto getCctvGeomDto() {
        if (this.cctvGeom != null) {
            return new GeomDto(this.cctvGeom.getX(), this.cctvGeom.getY());
        }
        return null;
    }

    public static class GeomDto {
        public double x;
        public double y;

        public GeomDto(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }

    @Column(name = "detection_confidence")
    private Double detectionConfidence;

    @Column(name = "detection_model")
    private String detectionModel;
}

