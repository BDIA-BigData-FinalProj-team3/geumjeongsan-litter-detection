package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;

@Entity
@Table(name = "vw_fire_hotspot_cctv")
@Immutable
@Getter
@NoArgsConstructor
public class FireHotspotCctv {

    @Id
    @Column(name = "cctv_id")
    private Long cctvId;

    @Column(name = "cctv_code")
    private String cctvCode;

    @Column(name = "cctv_address")
    private String cctvAddress;

    @Column(name = "cctv_address_description")
    private String cctvAddressDescription;

    @Column(name = "geom")
    private Point geom;

    @Column(name = "total_fire_count")
    private Long totalFireCount;

    @Column(name = "fire_count_30d")
    private Long fireCount30d;

    @Column(name = "fire_count_7d")
    private Long fireCount7d;

    @Column(name = "fire_count_this_month")
    private Long fireCountThisMonth;

    @Column(name = "fire_count_last_month")
    private Long fireCountLastMonth;

    @Column(name = "first_fire_at")
    private LocalDateTime firstFireAt;

    @Column(name = "last_fire_at")
    private LocalDateTime lastFireAt;

    @Column(name = "avg_severity_score")
    private Double avgSeverityScore;

    @Column(name = "max_severity_score")
    private Integer maxSeverityScore;

    public Double getLatitude() {
        return geom != null ? geom.getY() : null;
    }

    public Double getLongitude() {
        return geom != null ? geom.getX() : null;
    }

    public String getGeomWkt() {
        return geom != null ? geom.toText() : null;
    }
}

