package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentStatusUpdateRequest {
    private String status;  // "RESOLVED", "IN_PROGRESS", "EXTINGUISHING" 등
    private String handlerName;  // 처리자 이름 (선택적)
}

