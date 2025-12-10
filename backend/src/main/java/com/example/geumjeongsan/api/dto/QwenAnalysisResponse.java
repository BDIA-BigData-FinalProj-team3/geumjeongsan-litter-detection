package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QwenAnalysisResponse {
    private boolean hasTrash;  // severity_level >= 1
    private String cctvCode;
    private String location;
    private String time;
    private String type;  // "trash"
    private String confidence;  // "76%"
    private String severity;  // "하", "중", "상"
    private String summary;  // object_amount
    private String mainCategory;  // 플라스틱 등
    private String objectAmount;  // "총 1개의 쓰레기가 탐지되었습니다..."
    private String detectionConfidenceReason;
    private String severityLevelReason;
    private String overlayImageUrl;
    private Integer severityLevel;  // 원본 severity_level
    private Double detectionConfidence;  // 원본 confidence (0.76)
}

