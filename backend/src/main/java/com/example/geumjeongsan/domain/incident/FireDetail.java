package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "fire_detail")
@Getter
@Setter
public class FireDetail {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "wind_speed", precision = 5, scale = 2)
    private BigDecimal windSpeed; // km/h

    @Column(name = "wind_info", length = 100)
    private String windInfo;  // "12.3km/h(북서풍)" 등

    @Column(name = "note", columnDefinition = "text")
    private String note;
}

