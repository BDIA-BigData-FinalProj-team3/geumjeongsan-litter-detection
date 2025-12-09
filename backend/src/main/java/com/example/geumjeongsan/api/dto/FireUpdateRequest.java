package com.example.geumjeongsan.api.dto;

import lombok.Data;
import java.time.OffsetDateTime;

/**
 * 화재 수정 요청 DTO
 */
@Data
public class FireUpdateRequest {
    // 기본 정보
    private OffsetDateTime detectedAt;      // 발생 시간
    private String locationDesc;            // 발생 위치
    private String severityLevel;           // 심각도 (HIGH/MEDIUM/LOW)
    private String status;                  // 상태 (PENDING/IN_PROGRESS/EXTINGUISHING/RESOLVED)
    private String handlerName;             // 처리자 이름
    
    // 화재 상세 정보
    private Double windSpeed;               // 풍속 (m/s)
    private String windInfo;                // 풍향/풍속 요약
    private String spreadDirection;         // 확산 방향
    private String spreadRisk;              // 확산 위험도
    private String nearbyRisks;             // 주변 위험요인
    private String note;                    // 메모/특이사항
    
    // 등록자 정보
    private Long updatedById;               // 수정한 직원 ID
}

