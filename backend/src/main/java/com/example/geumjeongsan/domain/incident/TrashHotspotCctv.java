package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;

@Entity
@Table(name = "vw_trash_hotspot_cctv")
@Immutable
@Getter
@NoArgsConstructor
public class TrashHotspotCctv {

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

    @Column(name = "total_trash_count")
    private Long totalTrashCount;

    @Column(name = "trash_count_30d")
    private Long trashCount30d;

    @Column(name = "trash_count_7d")
    private Long trashCount7d;

    @Column(name = "trash_count_this_month")
    private Long trashCountThisMonth;

    @Column(name = "trash_count_last_month")
    private Long trashCountLastMonth;

    @Column(name = "first_trash_at")
    private LocalDateTime firstTrashAt;

    @Column(name = "last_trash_at")
    private LocalDateTime lastTrashAt;

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

