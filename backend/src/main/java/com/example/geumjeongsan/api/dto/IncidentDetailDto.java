package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.IncidentListView;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

/**
 * 사건 상세정보 DTO
 * VIEW의 모든 정보를 포함하고 프론트엔드 형식으로 변환
 * 오토탐지 상세 페이지용
 */
@Getter
public class IncidentDetailDto {
    // 기본 정보
    private final Long id;
    private final String accidentCode;
    private final String type;  // '화재', '응급', '쓰레기' (한글)
    private final String cctvId;
    private final String cctvCode;
    private final String location;
    private final String locationDesc;
    private final String time;  // 포맷: "2025-12-07 10:15"
    private final String status;  // 한글 상태
    private final String severity;  // 한글 위험도
    private final String handler;
    private final String handlerDept;
    private final String detectionBasis;
    private final String note;  // memo
    private final String responseTime;  // 처리완료 시간
    private final String duration;  // 소요 시간
    
    // CCTV 정보
    private final String cctvAddress;
    private final String cctvAddressDescription;
    private final Double latitude;  // CCTV 위도
    private final Double longitude;  // CCTV 경도
    
    // AUTO 정보 (AI 자동 탐지)
    private final Boolean isAIDetection;
    private final String modelName;  // detection_model
    private final String modelVersion;  // detection_version
    private final String confidence;  // detection_confidence를 퍼센트로 변환
    private final String confidenceReason;
    private final String severityReason;
    private final String detectedFeatures;
    private final String autoCreatedAt;  // AI 탐지 시간
    
    // 응급 상세 (EMERGENCY 타입일 때만)
    private final String patientName;
    private final String patientAge;
    private final String patientGender;
    private final String emergencyType;
    private final String emergencySymptom;
    private final String rescueTeam;  // emergency_response_team
    private final String transferHospital;  // emergency_transfer_dest
    
    // 화재 상세 (FIRE 타입일 때만)
    private final String windSpeed;  // fire_wind_speed
    private final String windInfo;  // fire_wind_info (풍향/풍속 통합)
    private final String spreadDirection;  // fire_spread_direction
    private final String surroundingRisk;  // fire_spread_risk
    
    // 쓰레기 상세 (TRASH 타입일 때만)
    private final String trashType;  // trash_main_category
    private final String amount;  // trash_object_amount
    private final String trashNote;  // trash_note
    
    private static final DateTimeFormatter TIME_FORMATTER = 
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    // 기본 생성자 (CCTV 좌표 없이)
    public IncidentDetailDto(IncidentListView view) {
        this(view, null, null);
    }
    
    // CCTV 좌표 포함 생성자
    public IncidentDetailDto(IncidentListView view, Double latitude, Double longitude) {
        this.id = view.getIncidentId();
        this.accidentCode = view.getIncidentCode();
        
        // 유형 한글 변환
        this.type = convertTypeToKorean(view.getIncidentType());
        
        // CCTV 정보
        this.cctvId = view.getCctvId() != null ? view.getCctvId().toString() : "";
        this.cctvCode = view.getCctvCode() != null ? view.getCctvCode() : "";
        this.cctvAddress = view.getCctvAddress();
        this.cctvAddressDescription = view.getCctvAddressDescription();
        // VIEW의 geom에서 좌표 추출 (우선 사용), 없으면 별도 조회한 좌표 사용
        this.latitude = view.getCctvLatitude() != null ? view.getCctvLatitude() : latitude;
        this.longitude = view.getCctvLongitude() != null ? view.getCctvLongitude() : longitude;
        
        // 위치 (CCTV 주소 우선, 없으면 location_desc)
        this.location = view.getCctvAddress() != null 
                ? view.getCctvAddress() 
                : (view.getLocationDesc() != null ? view.getLocationDesc() : "");
        this.locationDesc = view.getLocationDesc();
        
        // 시간 포맷
        this.time = view.getDetectedAt() != null 
                ? view.getDetectedAt().format(TIME_FORMATTER) 
                : "";
        
        // 상태 한글 변환
        this.status = convertStatusToKorean(view.getStatus(), view.getIncidentType());
        
        // 심각도 한글 변환
        this.severity = convertSeverityToKorean(view.getSeverityLevel());
        
        // 처리자
        this.handler = view.getHandlerName() != null ? view.getHandlerName() : "미지정";
        this.handlerDept = view.getHandlerDept();
        
        // 탐지 근거
        boolean isAuto = "AUTO".equals(view.getSourceType());
        this.isAIDetection = isAuto;
        this.detectionBasis = isAuto
                ? "AI 자동 탐지" + (view.getConfidenceReason() != null ? ": " + view.getConfidenceReason() : "")
                : "수동 등록";
        
        // 메모
        this.note = view.getMemo();
        
        // 처리완료 시간
        this.responseTime = view.getResolvedAt() != null 
                ? view.getResolvedAt().format(TIME_FORMATTER) 
                : null;
        
        // 소요 시간
        this.duration = view.getProcessingMinutes() != null 
                ? formatDuration(view.getProcessingMinutes()) 
                : null;
        
        // AUTO 정보
        this.modelName = view.getDetectionModel();
        this.modelVersion = view.getDetectionVersion();
        this.confidence = view.getDetectionConfidence() != null 
                ? String.format("%.0f%%", view.getDetectionConfidence() * 100)
                : null;
        this.confidenceReason = view.getConfidenceReason();
        this.severityReason = view.getSeverityReason();
        this.detectedFeatures = view.getDetectedFeatures();
        this.autoCreatedAt = view.getAutoCreatedAt() != null
                ? view.getAutoCreatedAt().format(TIME_FORMATTER)
                : null;
        
        // 응급 상세
        this.patientName = view.getEmergencyPatientName();
        this.patientAge = view.getEmergencyPatientAge();
        this.patientGender = view.getEmergencyPatientGender();
        this.emergencyType = view.getEmergencyType();
        this.emergencySymptom = view.getEmergencySymptom();
        this.rescueTeam = view.getEmergencyResponseTeam();
        this.transferHospital = view.getEmergencyTransferDest();
        
        // 화재 상세
        this.windSpeed = view.getFireWindSpeed() != null 
                ? String.format("%.1f m/s", view.getFireWindSpeed())
                : null;
        this.windInfo = view.getFireWindInfo();  // "남동풍 15m/s" 형식
        this.spreadDirection = view.getFireSpreadDirection();
        this.surroundingRisk = view.getFireSpreadRisk();
        
        // 쓰레기 상세
        this.trashType = view.getTrashMainCategory();
        this.amount = view.getTrashObjectAmount();
        this.trashNote = view.getTrashNote();
    }

    private String convertTypeToKorean(String type) {
        if (type == null) return "";
        switch (type) {
            case "FIRE": return "화재";
            case "EMERGENCY": return "응급";
            case "TRASH": return "쓰레기";
            case "ROCKFALL": return "낙석";
            default: return type;
        }
    }

    private String convertStatusToKorean(String status, String type) {
        if (status == null) return "";
        switch (status) {
            case "PENDING": return "대기중";
            case "IN_PROGRESS":
                if ("FIRE".equals(type)) return "진화중";
                return "대응중";
            case "RESOLVED":
                if ("FIRE".equals(type)) return "진화완료";
                return "처리완료";
            default: return status;
        }
    }

    private String convertSeverityToKorean(String severity) {
        if (severity == null) return "";
        switch (severity) {
            case "HIGH": return "상";
            case "MEDIUM": return "중";
            case "LOW": return "하";
            default: return severity;
        }
    }

    private String formatDuration(Double minutes) {
        if (minutes == null) return null;
        int totalMinutes = minutes.intValue();
        if (totalMinutes < 60) {
            return totalMinutes + "분";
        }
        int hours = totalMinutes / 60;
        int mins = totalMinutes % 60;
        return hours + "시간 " + mins + "분";
    }
}

