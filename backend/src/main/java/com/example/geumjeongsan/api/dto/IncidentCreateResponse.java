package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 신규 사건 등록 응답 DTO (공통)
 */
@Getter
@AllArgsConstructor
public class IncidentCreateResponse {
    private Long incidentId;
    private String incidentCode;
    private String message;
    
    public static IncidentCreateResponse success(Long incidentId, String incidentCode) {
        return new IncidentCreateResponse(
            incidentId, 
            incidentCode, 
            "사건이 성공적으로 등록되었습니다."
        );
    }
}

