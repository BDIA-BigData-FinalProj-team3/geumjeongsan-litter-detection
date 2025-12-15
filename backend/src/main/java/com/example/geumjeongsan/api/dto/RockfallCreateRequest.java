package com.example.geumjeongsan.api.dto;

import lombok.Data;
import java.time.OffsetDateTime;

/**
 * 낙석 신규 등록 요청 DTO
 */
@Data
public class RockfallCreateRequest {
    // 필수 필드
    private OffsetDateTime detectedAt;      // 발생 시간
    private String locationDesc;            // 발생 위치
    private String severityLevel;           // 심각도 (HIGH/MEDIUM/LOW)
    
    // 낙석 상세 (DDL 기반: 전부 수동입력)
    private String rockSizeClass;           // 암괴 규모 (자유입력 문자열) - NOT NULL
    private String affectedAssetType;       // 피해 대상 유형 (자유입력 문자열) - NOT NULL
    private String affectedAssetName;       // 피해 대상 식별
    private String damageDescription;       // 피해 설명
    
    // 공통 선택 필드
    private String memo;                    // 메모
    
    // 등록자 정보
    private Long createdById;               // 등록한 직원 ID (현재 로그인 사용자)
}

