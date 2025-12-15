package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "incident_auto")
@Getter
@Setter
public class IncidentAuto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "auto_id")
    private Long id;

    @Column(name = "incident_id", nullable = false, unique = true)
    private Long incidentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "detection_model", length = 100)
    private String detectionModel;

    @Column(name = "detection_version", length = 50)
    private String detectionVersion;

    @Column(name = "detection_confidence")
    private Double detectionConfidence;

    @Column(name = "confidence_reason", columnDefinition = "text")
    private String confidenceReason;

    @Column(name = "severity_reason", columnDefinition = "text")
    private String severityReason;

    @Column(name = "detected_features", columnDefinition = "text")
    private String detectedFeatures;

    @Column(name = "auto_created_at")
    private OffsetDateTime autoCreatedAt;
}

