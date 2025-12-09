package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fire_detail")
@Getter
@Setter
public class FireDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fire_id")
    private Long id;

    @Column(name = "incident_id", unique = true)
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "wind_speed", precision = 5, scale = 2)
    private BigDecimal windSpeed;

    @Column(name = "wind_info", length = 50)
    private String windInfo;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "spread_direction", columnDefinition = "text")
    private String spreadDirection;

    @Column(name = "nearby_risks", columnDefinition = "text")
    private String nearbyRisks;

    @Column(name = "spread_risk", length = 20)
    private String spreadRisk;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
