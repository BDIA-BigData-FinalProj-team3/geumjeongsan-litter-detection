package com.example.geumjeongsan.api.dto;

import lombok.Data;
import java.time.OffsetDateTime;

/**
 * 쓰레기 신규 등록 요청 DTO
 */
@Data
public class TrashCreateRequest {
    // 필수 필드
    private OffsetDateTime detectedAt;      // 발생 시간
    private String locationDesc;            // 발생 위치
    private String severityLevel;           // 심각도 (HIGH/MEDIUM/LOW)
    
    // 선택 필드
    private String memo;                    // 메모
    private String trashType;               // 쓰레기 종류
    private String amount;                  // 양
    
    // 등록자 정보
    private Long createdById;               // 등록한 직원 ID (현재 로그인 사용자)
}

