package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.IncidentListView;
import com.example.geumjeongsan.domain.incident.IncidentManual;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

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

    // MANUAL 정보 (수동 등록일 때만)
    private final String manualLocation;
    private final String manualDescription;
    private final Long manualCreatedById;

    // ===== 미디어 (S3 저장 결과) =====
    // IncidentDetailModal에서 그대로 사용
    private final String clipUrl;        // VIDEO 1개(최신)
    private final List<String> frameUrls; // FRAME(overlay) 여러 개
    
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
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private static String formatKst(OffsetDateTime t) {
        if (t == null) return null;
        try {
            return t.atZoneSameInstant(KST).toLocalDateTime().format(TIME_FORMATTER);
        } catch (Exception e) {
            return t.toString();
        }
    }

    // 기본 생성자 (CCTV 좌표 없이)
    public IncidentDetailDto(IncidentListView view) {
        this(view, null, null);
    }
    
    // CCTV 좌표 포함 생성자
    public IncidentDetailDto(IncidentListView view, Double latitude, Double longitude) {
        this(view, latitude, longitude, null, Collections.emptyList());
    }

    // CCTV 좌표 + 미디어 포함 생성자
    public IncidentDetailDto(IncidentListView view, Double latitude, Double longitude, String clipUrl, List<String> frameUrls) {
        this(view, latitude, longitude, clipUrl, frameUrls, null);
    }

    // CCTV 좌표 + 미디어 + 수동등록(incident_manual) 포함 생성자
    public IncidentDetailDto(IncidentListView view, Double latitude, Double longitude, String clipUrl, List<String> frameUrls, IncidentManual manual) {
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
        this.time = view.getDetectedAt() != null ? formatKst(view.getDetectedAt()) : "";
        
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
        // ✅ 중복 방지: detectionBasis에는 방식만 표시하고, 근거는 confidenceReason에서만 표시한다.
        this.detectionBasis = isAuto ? "AI 자동 탐지" : "수동 등록";
        
        // 메모
        // ✅ 과거 데이터 호환: memo가 AI JSON 원문(= 화면에 노출되면 깨짐)인 경우 숨김 처리
        String memo = view.getMemo();
        if (memo != null) {
            String t = memo.trim();
            // 매우 단순한 휴리스틱: JSON object이고 analysis_result 같은 키를 포함하면 "원문"으로 판단
            if (t.startsWith("{") && (t.contains("\"analysis_result\"") || t.contains("\"analysisResult\""))) {
                memo = null;
            }
        }
        this.note = memo;
        
        // 처리완료 시간
        this.responseTime = view.getResolvedAt() != null ? formatKst(view.getResolvedAt()) : null;
        
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
                ? formatKst(view.getAutoCreatedAt())
                : null;

        // MANUAL 정보 (incident_manual)
        this.manualLocation = manual != null ? manual.getManualLocation() : null;
        this.manualDescription = manual != null ? manual.getManualDescription() : null;
        this.manualCreatedById = manual != null ? manual.getCreatedById() : null;

        this.clipUrl = clipUrl;
        this.frameUrls = frameUrls != null ? frameUrls : Collections.emptyList();
        
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

