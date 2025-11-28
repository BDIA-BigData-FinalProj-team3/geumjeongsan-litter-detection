package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "rockfall_detail")
@Getter
@Setter
public class RockfallDetail {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "magnitude", precision = 5, scale = 2)
    private BigDecimal magnitude;

    @Column(name = "note", columnDefinition = "text")
    private String note;
}

