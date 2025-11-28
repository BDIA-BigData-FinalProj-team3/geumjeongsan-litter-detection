package com.example.geumjeongsan.domain.cctv;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.locationtech.jts.geom.Point;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cctv")
@Getter
@Setter
public class CCTV {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cctv_id")
    private Long id;

    @Column(name = "cctv_code", unique = true, nullable = false, length = 50)
    private String cctvCode;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "location_desc", columnDefinition = "text")
    private String locationDesc;

    @Column(name = "geom", columnDefinition = "geometry(Point,4326)")
    private Point geom;

    @Column(name = "install_date")
    private LocalDate installDate;

    @Column(name = "model_name", length = 50)
    private String modelName;

    @Column(name = "resolution", length = 20)
    private String resolution;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "power_status", length = 10)
    private String powerStatus;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

