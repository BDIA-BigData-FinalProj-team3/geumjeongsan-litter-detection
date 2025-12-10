package com.example.geumjeongsan.domain.incident;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Point;

import java.time.OffsetDateTime;

/**
 * 전체 사건 목록 VIEW Entity
 * VIEW: view_all_incidents_list
 * 용도: 전체현황 페이지 리스트 (진행중/처리완료 탭, 검색, 페이징)
 */
@Entity
@Getter
@Immutable
@Table(name = "view_all_incidents_list")
public class IncidentListView {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "incident_type")
    private String incidentType;

    @Column(name = "incident_code")
    private String incidentCode;

    @Column(name = "cctv_id")
    private Long cctvId;

    @Column(name = "source_type")
    private String sourceType;

    @Column(name = "severity_level")
    private String severityLevel;

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @Column(name = "location_desc")
    private String locationDesc;

    @Column(name = "status")
    private String status;

    @Column(name = "memo")
    private String memo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // CCTV 정보
    @Column(name = "cctv_code")
    private String cctvCode;

    @Column(name = "cctv_address")
    private String cctvAddress;

    @Column(name = "cctv_address_description")
    private String cctvAddressDescription;

    // CCTV 좌표 (PostGIS Point)
    @JsonIgnore
    @Column(name = "cctv_geom", columnDefinition = "geometry(Point,4326)")
    private Point cctvGeom;
    
    /**
     * CCTV 위도 추출
     */
    public Double getCctvLatitude() {
        return cctvGeom != null ? cctvGeom.getY() : null;
    }
    
    /**
     * CCTV 경도 추출
     */
    public Double getCctvLongitude() {
        return cctvGeom != null ? cctvGeom.getX() : null;
    }

    // AUTO 정보 (최신 1개)
    @Column(name = "detection_confidence")
    private Double detectionConfidence;

    @Column(name = "detection_model")
    private String detectionModel;

    @Column(name = "detection_version")
    private String detectionVersion;

    @Column(name = "confidence_reason")
    private String confidenceReason;

    @Column(name = "severity_reason")
    private String severityReason;

    @Column(name = "detected_features")
    private String detectedFeatures;

    @Column(name = "auto_created_at")
    private OffsetDateTime autoCreatedAt;

    // MANUAL 정보
    @Column(name = "manual_location")
    private String manualLocation;

    @Column(name = "manual_description")
    private String manualDescription;

    @Column(name = "manual_created_by_id")
    private Long manualCreatedById;

    // 처리 담당자
    @Column(name = "handler_name")
    private String handlerName;

    @Column(name = "handler_dept")
    private String handlerDept;

    @Column(name = "handler_id")
    private Long handlerId;

    // 처리 시간
    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "processing_minutes")
    private Double processingMinutes;

    // 응급 상세
    @Column(name = "emergency_patient_name")
    private String emergencyPatientName;

    @Column(name = "emergency_patient_age")
    private String emergencyPatientAge;

    @Column(name = "emergency_patient_gender")
    private String emergencyPatientGender;

    @Column(name = "emergency_type")
    private String emergencyType;

    @Column(name = "emergency_symptom")
    private String emergencySymptom;

    @Column(name = "emergency_response_team")
    private String emergencyResponseTeam;

    @Column(name = "emergency_transfer_dest")
    private String emergencyTransferDest;

    // 화재 상세
    @Column(name = "fire_wind_speed")
    private Double fireWindSpeed;

    @Column(name = "fire_wind_info")
    private String fireWindInfo;

    @Column(name = "fire_spread_direction")
    private String fireSpreadDirection;

    @Column(name = "fire_spread_risk")
    private String fireSpreadRisk;

    // 쓰레기 상세
    @Column(name = "trash_main_category")
    private String trashMainCategory;

    @Column(name = "trash_object_amount")
    private String trashObjectAmount;

    @Column(name = "trash_note")
    private String trashNote;
}

