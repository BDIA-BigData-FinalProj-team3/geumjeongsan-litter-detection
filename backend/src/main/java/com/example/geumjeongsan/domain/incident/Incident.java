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

    @Column(name = "cctv_id")
    private Long cctvId;

    @Column(name = "incident_type", length = 20)
    private String incidentType; // EMERGENCY / FIRE / TRASH

    @Column(name = "incident_code", length = 50, unique = true)
    private String incidentCode; // E-251209-001 / F-251209-001 / T-251209-001

    @Column(name = "source_type", length = 10)
    private String sourceType; // AUTO / MANUAL

    @Column(name = "severity_level", length = 20)
    private String severityLevel; // very low / LOW / MEDIUM / HIGH / very high

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @Column(name = "location_desc", columnDefinition = "text")
    private String locationDesc;

    @Column(name = "status", length = 20)
    private String status; // PENDING / IN_PROGRESS / RESOLVED

    @Column(name = "memo", columnDefinition = "text")
    private String memo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    // ===== 아래 필드들은 DB 컬럼이 없지만 기존 코드 호환을 위해 @Transient로 유지 =====
    
    @Transient  // DB에 없음 (incident_action 테이블에만 저장)
    private OffsetDateTime acknowledgedAt;
    
    @Transient  // DB에 없음 (incident_action 테이블에만 저장)
    private OffsetDateTime resolvedAt;
    
    @Transient  // DB에 없음 (incident_action 테이블에만 저장)
    private Long handlerId;
    
    @Transient  // DB에 없음 (incident_action 테이블에만 저장)
    private String handlerName;
    
    @Transient  // DB에 없음 (DDL에 없음)
    private String riskAreaName;
    
    @Transient  // DB에 없음 (incident_auto 테이블에만 있음)
    private String detectionModel;
    
    @Transient  // DB에 없음 (incident_auto 테이블에만 있음)
    private Double detectionConfidence;
}
