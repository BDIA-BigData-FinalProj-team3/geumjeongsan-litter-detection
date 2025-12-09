package com.example.geumjeongsan.api.dto;

import lombok.Data;
import java.time.OffsetDateTime;

/**
 * 응급 신규 등록 요청 DTO
 */
@Data
public class EmergencyCreateRequest {
    // 필수 필드
    private OffsetDateTime detectedAt;      // 발생 시간
    private String locationDesc;            // 발생 위치
    private String severityLevel;           // 심각도 (HIGH/MEDIUM/LOW)
    
    // 선택 필드
    private String memo;                    // 메모
    
    // 환자 정보 (선택)
    private String patientName;             // 환자 이름
    private String patientAge;              // 환자 나이
    private String patientGender;           // 환자 성별
    
    // 대응 정보 (선택)
    private String responseTeam;            // 투입 구조팀
    private String transferDest;            // 이송 병원/인계 기관
    
    // 등록자 정보
    private Long createdById;               // 등록한 직원 ID (현재 로그인 사용자)
}

