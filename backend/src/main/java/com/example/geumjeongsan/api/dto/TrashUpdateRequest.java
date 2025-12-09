package com.example.geumjeongsan.api.dto;

import lombok.Data;
import java.time.OffsetDateTime;

/**
 * 쓰레기 수정 요청 DTO
 */
@Data
public class TrashUpdateRequest {
    // 기본 정보
    private OffsetDateTime detectedAt;      // 발생 시간
    private String locationDesc;            // 발생 위치
    private String severityLevel;           // 심각도 (HIGH/MEDIUM/LOW)
    private String status;                  // 상태 (PENDING/IN_PROGRESS/RESOLVED)
    private String handlerName;             // 처리자 이름
    
    // 쓰레기 상세 정보
    private String mainCategory;            // 쓰레기 종류
    private String objectAmount;            // 양
    private String note;                    // 메모/특이사항
    
    // 등록자 정보
    private Long updatedById;               // 수정한 직원 ID
}

