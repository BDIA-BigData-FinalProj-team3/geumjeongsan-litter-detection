package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "incident_manual")
@Getter
@Setter
public class IncidentManual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "manual_id")
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private Long incidentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    // DB DDL 기준: incident_manual(manual_description, manual_location, created_by_id NOT NULL)
    @Column(name = "manual_description", columnDefinition = "text")
    private String manualDescription;

    @Column(name = "manual_location", columnDefinition = "text")
    private String manualLocation;

    @Column(name = "created_by_id", nullable = false)
    private Long createdById;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

