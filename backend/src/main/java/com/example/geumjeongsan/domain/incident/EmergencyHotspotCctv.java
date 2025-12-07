package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Geometry;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vw_emergency_hotspot_cctv")
@Immutable  // VIEW는 읽기 전용
@Getter
@NoArgsConstructor
public class EmergencyHotspotCctv {
    
    @Id
    @Column(name = "cctv_id")
    private Long cctvId;
    
    @Column(name = "cctv_code")
    private String cctvCode;
    
    @Column(name = "cctv_address")
    private String cctvAddress;
    
    @Column(name = "cctv_address_description")
    private String cctvAddressDescription;
    
    @Column(name = "geom", columnDefinition = "geometry")
    private Geometry geom;
    
    @Column(name = "total_emergency_count")
    private Long totalEmergencyCount;
    
    @Column(name = "emergency_count_30d")
    private Long emergencyCount30d;
    
    @Column(name = "emergency_count_7d")
    private Long emergencyCount7d;
    
    @Column(name = "emergency_count_this_month")
    private Long emergencyCountThisMonth;
    
    @Column(name = "emergency_count_last_month")
    private Long emergencyCountLastMonth;
    
    @Column(name = "first_emergency_at")
    private OffsetDateTime firstEmergencyAt;
    
    @Column(name = "last_emergency_at")
    private OffsetDateTime lastEmergencyAt;
    
    @Column(name = "avg_severity_score")
    private Double avgSeverityScore;
    
    @Column(name = "max_severity_score")
    private Integer maxSeverityScore;
}

