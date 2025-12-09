package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "emergency_detail")
@Getter
@Setter
public class EmergencyDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emergency_id")
    private Long id;

    @Column(name = "incident_id", unique = true)
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "patient_name", length = 50)
    private String patientName;

    @Column(name = "patient_age", length = 50)
    private String patientAge;

    @Column(name = "patient_gender", length = 50)
    private String patientGender;

    @Column(name = "emergency_type", length = 50)
    private String emergencyType;

    @Column(name = "symptom", columnDefinition = "text")
    private String symptom;

    @Column(name = "severity_level", length = 20)
    private String severityLevel;

    @Column(name = "response_team", length = 50)
    private String responseTeam;

    @Column(name = "transfer_dest", length = 100)
    private String transferDest;

    @Column(name = "occurred_at")
    private OffsetDateTime occurredAt;

    @Column(name = "location_desc", columnDefinition = "text")
    private String locationDesc;

    @Column(name = "injured_count")
    private Integer injuredCount;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
