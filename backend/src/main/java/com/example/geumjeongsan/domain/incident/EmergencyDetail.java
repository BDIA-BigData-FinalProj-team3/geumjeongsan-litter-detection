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
    @Column(name = "incident_id")
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "age")
    private Integer age;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "emergency_type", length = 50)
    private String emergencyType;

    @Column(name = "symptom", columnDefinition = "text")
    private String symptom;

    @Column(name = "severity_level", length = 10)
    private String severityLevel;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "response_team", length = 100)
    private String responseTeam;

    @Column(name = "transfer_dest", length = 100)
    private String transferDest;

    @Column(name = "occurred_at")
    private OffsetDateTime occurredAt;

    @Column(name = "location_desc", columnDefinition = "text")
    private String locationDesc;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

