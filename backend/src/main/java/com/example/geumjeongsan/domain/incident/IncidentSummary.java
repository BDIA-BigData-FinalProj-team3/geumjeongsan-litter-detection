package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vw_incident_summary")
@Immutable  // VIEW는 읽기 전용
@Getter
@NoArgsConstructor
public class IncidentSummary {
    
    @Id
    @Column(name = "incident_id")
    private Long incidentId;
    
    @Column(name = "cctv_id")
    private Long cctvId;
    
    @Column(name = "incident_type")
    private String incidentType;  // FIRE, EMERGENCY, TRASH
    
    @Column(name = "source_type")
    private String sourceType;
    
    @Column(name = "severity_level")
    private String severityLevel;
    
    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;
    
    @Column(name = "location_desc")
    private String locationDesc;
    
    @Column(name = "status")
    private String status;
    
    @Column(name = "memo")
    private String memo;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @Column(name = "first_ack_at")
    private OffsetDateTime firstAckAt;
    
    @Column(name = "first_resolved_at")
    private OffsetDateTime firstResolvedAt;
    
    @Column(name = "response_seconds")
    private Integer responseSeconds;
    
    @Column(name = "is_pending")
    private Boolean isPending;
}

