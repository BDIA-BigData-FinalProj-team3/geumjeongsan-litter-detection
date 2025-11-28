package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "incident")
@Getter
@Setter
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incident_id")
    private Long id;

    @Column(name = "cctv_id", nullable = false)
    private Long cctvId;

    @Column(name = "incident_type", nullable = false, length = 20)
    private String incidentType; // EMERGENCY / FIRE / ROCKFALL / TRASH

    @Column(name = "severity_level", nullable = false, length = 10)
    private String severityLevel; // LOW / MEDIUM / HIGH

    @Column(name = "status", nullable = false, length = 20)
    private String status; // PENDING / IN_PROGRESS / EXTINGUISHING(화재만) / RESOLVED

    @Column(name = "detected_at", nullable = false)
    private OffsetDateTime detectedAt;

    @Column(name = "acknowledged_at")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "location_desc")
    private String locationDesc;

    @Column(name = "risk_area_name")
    private String riskAreaName;

    @Column(name = "handler_id")
    private Long handlerId;

    @Column(name = "handler_name")
    private String handlerName;

    @Column(name = "memo")
    private String memo;

    // 모델 정보 (AI 모델이 실제로 생기면 사용)
    @Column(name = "detection_model", length = 100)
    @Getter
    @Setter
    private String detectionModel; 

    @Column(name = "detection_confidence")
    @Getter
    @Setter
    private Double detectionConfidence; 

    // PostGIS geometry 컬럼 (선택적 - DB에 컬럼이 있을 경우만 사용)
    // @Column(name = "location", columnDefinition = "geometry(Point,4326)")
    // private Point location;
}