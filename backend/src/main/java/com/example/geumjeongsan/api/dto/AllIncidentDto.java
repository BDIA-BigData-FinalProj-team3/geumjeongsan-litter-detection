package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.IncidentListView;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 전체현황 페이지 사건 목록 DTO
 * Frontend AllIncidentDetail 형식에 맞춤
 */
@Getter
public class AllIncidentDto {
    private final Long id;
    private final String accidentCode;
    private final String type;  // '화재', '응급', '쓰레기' (한글)
    private final String cctvId;
    private final String time;  // 포맷: "2025-12-07 10:15"
    private final String status;  // 한글 상태
    private final String severity;  // 한글 위험도
    private final String handler;
    private final String location;
    private final String detectionBasis;
    private final Double detectionConfidence;  // AI 탐지 신뢰도 (0.0 ~ 1.0)
    private final String responseTime;  // 처리완료 시만
    private final String duration;  // 처리완료 시만

    private static final DateTimeFormatter TIME_FORMATTER = 
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private static String formatKst(OffsetDateTime t) {
        if (t == null) return "";
        try {
            return t.atZoneSameInstant(KST).toLocalDateTime().format(TIME_FORMATTER);
        } catch (Exception e) {
            return t.toString();
        }
    }

    public AllIncidentDto(IncidentListView view) {
        this.id = view.getIncidentId();
        this.accidentCode = view.getIncidentCode();
        
        // 유형 한글 변환
        this.type = convertTypeToKorean(view.getIncidentType());
        
        // CCTV ID (null이면 빈 문자열)
        this.cctvId = view.getCctvCode() != null ? view.getCctvCode() : "";
        
        // 시간 포맷
        this.time = formatKst(view.getDetectedAt());
        
        // 상태 한글 변환
        this.status = convertStatusToKorean(view.getStatus(), view.getIncidentType());
        
        // 심각도 한글 변환
        this.severity = convertSeverityToKorean(view.getSeverityLevel());
        
        // ✅ 오탐 처리 여부 확인 (memo에 "[오탐 처리]" 포함 여부)
        boolean isFalsePositive = view.getMemo() != null && view.getMemo().contains("[오탐 처리]");
        
        // ✅ 처리자: 오탐이면 "오탐", 아니면 기존 로직
        this.handler = isFalsePositive ? "오탐" 
                : (view.getHandlerName() != null ? view.getHandlerName() : "미지정");
        
        // 위치
        this.location = view.getCctvAddress() != null 
                ? view.getCctvAddress() 
                : view.getLocationDesc();
        
        // 탐지 근거
        this.detectionBasis = "AUTO".equals(view.getSourceType())
                ? "AI 자동 탐지: " + (view.getConfidenceReason() != null ? view.getConfidenceReason() : "")
                : "수동 등록";
        
        // AI 탐지 신뢰도
        this.detectionConfidence = view.getDetectionConfidence();
        
        // ✅ 처리완료 시간: resolvedAt이 없고 RESOLVED 상태면 updatedAt 사용
        if (view.getResolvedAt() != null) {
            this.responseTime = formatKst(view.getResolvedAt());
        } else if ("RESOLVED".equals(view.getStatus()) && view.getUpdatedAt() != null) {
            this.responseTime = formatKst(view.getUpdatedAt());
        } else {
            this.responseTime = "";
        }
        
        // ✅ 소요 시간: processingMinutes가 없으면 수동 계산
        if (view.getProcessingMinutes() != null) {
            this.duration = formatDuration(view.getProcessingMinutes());
        } else if ("RESOLVED".equals(view.getStatus()) && view.getDetectedAt() != null && view.getResolvedAt() != null) {
            // resolvedAt이 있으면 계산
            long minutes = java.time.Duration.between(view.getDetectedAt(), view.getResolvedAt()).toMinutes();
            this.duration = formatDuration((double) minutes);
        } else if ("RESOLVED".equals(view.getStatus()) && view.getDetectedAt() != null && view.getUpdatedAt() != null) {
            // resolvedAt이 없으면 updatedAt으로 계산
            long minutes = java.time.Duration.between(view.getDetectedAt(), view.getUpdatedAt()).toMinutes();
            this.duration = formatDuration((double) minutes);
        } else {
            this.duration = "";
        }
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

