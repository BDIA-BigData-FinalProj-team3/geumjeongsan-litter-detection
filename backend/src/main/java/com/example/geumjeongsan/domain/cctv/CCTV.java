package com.example.geumjeongsan.domain.cctv;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.locationtech.jts.geom.Point;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cctv_info")
@Getter
@Setter
public class CCTV {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cctv_id")
    private Long id;

    @Column(name = "cctv_code", unique = true, nullable = false, length = 50)
    private String cctvCode;

    // DB 컬럼: cctv_address (name 대신)
    @Column(name = "cctv_address", columnDefinition = "text")
    private String name;

    // DB 컬럼: cctv_address_description (location_desc 대신)
    @Column(name = "cctv_address_description", columnDefinition = "text")
    private String locationDesc;

    @Column(name = "geom", columnDefinition = "geometry(Point,4326)")
    private Point geom;

    @Column(name = "install_date")
    private LocalDate installDate;

    @Column(name = "model_name", length = 50)
    private String modelName;

    // DB에 없는 컬럼 - @Transient (DB 조회 시 무시됨)
    @Transient
    private String resolution;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // DB에 없는 컬럼 - @Transient
    @Transient
    private String powerStatus;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    // DB 컬럼: segment_id 추가
    @Column(name = "segment_id")
    private Integer segmentId;
}

